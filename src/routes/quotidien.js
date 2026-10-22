// Sections, personnel, présences, transmissions, médicaments, ordonnances, documents.
import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma, ok, fail, ah, required, auth, roles, toDate, notify, isAdmin } from '../lib/core.js';
import { assertEtab, assertEnfant, enfantScope, etabScope } from '../lib/access.js';
import {  signFile } from '../lib/services.js';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const today = () => new Date(new Date().toDateString());
const tomorrow = () => new Date(today().getTime() + 864e5);
const enfantSel = { select: { id: true, prenom: true, nom: true } };
const etabParam = (req) => req.params.etablissementId;
const etabFromBody = (req) => req.body.etablissementId || req.user.etablissementId;

/** Fabrique un CRUD simple rattaché à un établissement. */
function crudEtab(base, model, requiredFields, mapIn = (b) => b, include) {
  router.get(`/${base}/etablissement/:etablissementId`, auth(), ah(async (req, res) => {
    await assertEtab(req.user, etabParam(req));
    ok(res, await prisma[model].findMany({ where: { etablissementId: etabParam(req) }, include, orderBy: { createdAt: "desc" } }));
  }));
  router.post(`/${base}`, auth(), roles("creche"), ah(async (req, res) => {
    const etablissementId = etabFromBody(req);
    required({ ...req.body, etablissementId }, [...requiredFields, "etablissementId"]);
    await assertEtab(req.user, etablissementId);
    ok(res, await prisma[model].create({ data: { ...mapIn(req.body), etablissementId } }), 201);
  }));
  router.put(`/${base}/:id`, auth(), roles("creche"), ah(async (req, res) => {
    const cur = await prisma[model].findUnique({ where: { id: req.params.id } });
    if (!cur) fail(404, "Élément introuvable");
    await assertEtab(req.user, cur.etablissementId);
    ok(res, await prisma[model].update({ where: { id: req.params.id }, data: mapIn(req.body) }));
  }));
  router.delete(`/${base}/:id`, auth(), roles("creche"), ah(async (req, res) => {
    const cur = await prisma[model].findUnique({ where: { id: req.params.id } });
    if (!cur) fail(404, "Élément introuvable");
    await assertEtab(req.user, cur.etablissementId);
    await prisma[model].delete({ where: { id: req.params.id } });
    ok(res, { supprime: true });
  }));
}

crudEtab("sections", "section", ["nom"], (b) => ({ nom: b.nom, ageMin: b.ageMin != null ? Number(b.ageMin) : undefined, ageMax: b.ageMax != null ? Number(b.ageMax) : undefined, capacite: b.capacite != null ? Number(b.capacite) : undefined }), { _count: { select: { enfants: true } } });
crudEtab("personnels", "personnel", ["prenom", "nom"], (b) => ({ prenom: b.prenom, nom: b.nom, poste: b.poste, email: b.email, telephone: b.telephone }));
crudEtab("documents-obligatoires", "documentObligatoire", ["type"], (b) => ({ type: b.type, description: b.description, validiteMois: b.validiteMois != null ? Number(b.validiteMois) : undefined }));

router.get("/sections/stats/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  const s = await prisma.section.findMany({ where: { etablissementId: etabParam(req) }, include: { _count: { select: { enfants: true } } } });
  ok(res, { total: s.length, sections: s.map((x) => ({ id: x.id, nom: x.nom, capacite: x.capacite, enfants: x._count.enfants })) });
}));
router.get("/personnels/stats/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  const p = await prisma.personnel.findMany({ where: { etablissementId: etabParam(req) } });
  const parPoste = {};
  p.forEach((x) => (parPoste[x.poste ?? "Autre"] = (parPoste[x.poste ?? "Autre"] ?? 0) + 1));
  ok(res, { total: p.length, parPoste });
}));

// ---------- Présences ----------
router.post("/presences", auth(), roles("creche"), ah(async (req, res) => {
  required(req.body, ["enfantId"]);
  await assertEnfant(req.user, req.body.enfantId);
  ok(res, await prisma.presence.create({ data: { enfantId: req.body.enfantId, date: toDate(req.body.date) ?? new Date(), present: req.body.present !== false } }), 201);
}));
router.get("/presences/stats/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  const jours = req.query.periode === "mois" ? 30 : 7;
  const ids = (await prisma.enfant.findMany({ where: { etablissementId: etabParam(req) }, select: { id: true } })).map((e) => e.id);
  const p = await prisma.presence.findMany({ where: { enfantId: { in: ids }, date: { gte: new Date(Date.now() - jours * 864e5) } } });
  const L = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const out = [];
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date(today().getTime() - i * 864e5);
    const ofDay = p.filter((x) => x.date.toDateString() === d.toDateString());
    out.push({ label: jours === 7 ? L[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`, presents: ofDay.filter((x) => x.present).length, absents: ofDay.filter((x) => !x.present).length });
  }
  ok(res, out);
}));

// ---------- Transmissions ----------
router.get("/transmissions/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  ok(res, await prisma.transmission.findMany({ where: { etablissementId: etabParam(req) }, include: { enfant: enfantSel }, orderBy: { createdAt: "desc" }, take: 500 }));
}));
router.get("/transmissions/today/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  ok(res, await prisma.transmission.findMany({ where: { etablissementId: etabParam(req), createdAt: { gte: today(), lt: tomorrow() } }, include: { enfant: enfantSel }, orderBy: { createdAt: "desc" } }));
}));
router.get("/transmissions/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.transmission.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } }));
}));
router.post("/transmissions", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  const enfantId = req.body.enfantId ?? req.body.enfant;
  required({ ...req.body, enfantId }, ["enfantId", "contenu"]);
  const e = await assertEnfant(req.user, enfantId);
  const t = await prisma.transmission.create({ data: { enfantId, etablissementId: e.etablissementId, auteurId: req.user.id, type: req.body.type ?? "activite", contenu: req.body.contenu, humeur: req.body.humeur } });
  const parents = await prisma.liaison.findMany({ where: { enfantId, role: "parent" } });
  await notify(parents.map((p) => p.userId), "Nouvelle transmission", `${e.prenom} : ${req.body.contenu.slice(0, 80)}`, "/parent");
  ok(res, t, 201);
}));
router.delete("/transmissions/:id", auth(), roles("creche"), ah(async (req, res) => {
  const t = await prisma.transmission.findUnique({ where: { id: req.params.id } });
  if (!t) fail(404, "Transmission introuvable");
  await assertEnfant(req.user, t.enfantId);
  await prisma.transmission.delete({ where: { id: t.id } });
  ok(res, { supprime: true });
}));

// ---------- Médicaments ----------
router.get("/medicaments/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  ok(res, await prisma.medicament.findMany({ where: { etablissementId: etabParam(req) }, include: { enfant: enfantSel }, orderBy: { createdAt: "desc" } }));
}));
router.get("/medicaments/today/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  ok(res, await prisma.medicament.findMany({ where: { etablissementId: etabParam(req), statut: "en_cours", dateDebut: { lte: tomorrow() }, OR: [{ dateFin: null }, { dateFin: { gte: today() } }] }, include: { enfant: enfantSel } }));
}));
router.get("/medicaments/stats/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  const m = await prisma.medicament.findMany({ where: { etablissementId: etabParam(req) } });
  ok(res, { total: m.length, enCours: m.filter((x) => x.statut === "en_cours").length, termines: m.filter((x) => x.statut === "termine").length });
}));
router.get("/medicaments/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.medicament.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } }));
}));
router.post("/medicaments", auth(), roles("creche", "medecin", "rsai", "parent"), ah(async (req, res) => {
  const enfantId = req.body.enfantId ?? req.body.enfant;
  required({ ...req.body, enfantId }, ["enfantId", "nom"]);
  const e = await assertEnfant(req.user, enfantId);
  const b = req.body;
  ok(res, await prisma.medicament.create({ data: { enfantId, etablissementId: e.etablissementId, ordonnanceId: b.ordonnanceId, nom: b.nom, posologie: b.posologie, horaires: Array.isArray(b.horaires) ? b.horaires : b.horaires ? String(b.horaires).split(",").map((s) => s.trim()) : [], dateDebut: toDate(b.dateDebut) ?? new Date(), dateFin: toDate(b.dateFin), statut: b.statut ?? "en_cours" } }), 201);
}));
router.put("/medicaments/:id", auth(), roles("creche", "medecin", "rsai"), ah(async (req, res) => {
  const m = await prisma.medicament.findUnique({ where: { id: req.params.id } });
  if (!m) fail(404, "Traitement introuvable");
  await assertEnfant(req.user, m.enfantId);
  const { nom, posologie, statut, dateFin } = req.body;
  ok(res, await prisma.medicament.update({ where: { id: m.id }, data: { nom, posologie, statut, dateFin: toDate(dateFin) } }));
}));
router.delete("/medicaments/:id", auth(), roles("creche", "medecin"), ah(async (req, res) => {
  const m = await prisma.medicament.findUnique({ where: { id: req.params.id } });
  if (!m) fail(404, "Traitement introuvable");
  await assertEnfant(req.user, m.enfantId);
  await prisma.medicament.delete({ where: { id: m.id } });
  ok(res, { supprime: true });
}));

// ---------- Ordonnances ----------
router.get("/ordonnances/medecin/:medecinId", auth(), ah(async (req, res) => {
  if (!isAdmin(req.user) && req.user.id !== req.params.medecinId) fail(403, "Permissions insuffisantes");
  ok(res, await prisma.ordonnance.findMany({ where: { medecinId: req.params.medecinId }, include: { enfant: enfantSel }, orderBy: { date: "desc" } }));
}));
router.get("/ordonnances/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.ordonnance.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { date: "desc" } }));
}));
router.get("/ordonnances/stats/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  const o = await prisma.ordonnance.findMany({ where: { etablissementId: etabParam(req) } });
  ok(res, { total: o.length, actives: o.filter((x) => x.statut === "active").length, expirees: o.filter((x) => x.dateFin && x.dateFin < new Date()).length });
}));
router.post("/ordonnances", auth(), roles("medecin"), ah(async (req, res) => {
  const enfantId = req.body.enfantId ?? req.body.enfant;
  required({ ...req.body, enfantId }, ["enfantId"]);
  const e = await assertEnfant(req.user, enfantId);
  ok(res, await prisma.ordonnance.create({ data: { enfantId, medecinId: req.body.medecinId ?? req.user.id, etablissementId: e.etablissementId, contenu: req.body.contenu, date: toDate(req.body.date) ?? new Date(), dateFin: toDate(req.body.dateFin), statut: req.body.statut ?? "active" } }), 201);
}));
router.put("/ordonnances/:id", auth(), roles("medecin"), ah(async (req, res) => {
  const o = await prisma.ordonnance.findUnique({ where: { id: req.params.id } });
  if (!o) fail(404, "Ordonnance introuvable");
  await assertEnfant(req.user, o.enfantId);
  ok(res, await prisma.ordonnance.update({ where: { id: o.id }, data: { contenu: req.body.contenu, statut: req.body.statut, dateFin: toDate(req.body.dateFin) } }));
}));
router.delete("/ordonnances/:id", auth(), roles("medecin"), ah(async (req, res) => {
  const o = await prisma.ordonnance.findUnique({ where: { id: req.params.id } });
  if (!o) fail(404, "Ordonnance introuvable");
  await assertEnfant(req.user, o.enfantId);
  await prisma.ordonnance.delete({ where: { id: o.id } });
  ok(res, { supprime: true });
}));

// ---------- Documents ----------
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname)) }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /application\/pdf|image\/(jpeg|png)/.test(f.mimetype)),
});
const withUrl = (d) => ({ ...d, url: signFile(path.basename(d.url)) });

async function createDoc(req, extra = {}) {
  if (!req.file) fail(400, "Champs manquants : fichier (PDF/JPG/PNG ≤ 10 Mo)");
  const enfantId = req.body.enfant || req.body.enfantId;
  let etablissementId = req.body.etablissementId || req.user.etablissementId || null;
  if (enfantId) etablissementId = (await assertEnfant(req.user, enfantId)).etablissementId;
  return prisma.document.create({ data: { nom: req.body.nom || req.file.originalname, type: req.body.type || "Autre", url: req.file.filename, mimeType: req.file.mimetype, taille: req.file.size, enfantId: enfantId || null, etablissementId, auteurId: req.user.id, dateValidite: toDate(req.body.dateValidite), ...extra } });
}

router.post("/documents/upload-direct", auth(), roles("creche", "rsai", "parent", "medecin"), upload.single("fichier"), ah(async (req, res) => {
  ok(res, withUrl(await createDoc(req)), 201);
}));
router.post("/documents/depot-medical", auth(), roles("medecin", "parent"), upload.single("fichier"), ah(async (req, res) => {
  required({ enfant: req.body.enfant || req.body.enfantId }, ["enfant"]);
  const d = await createDoc(req);
  let ordonnanceId;
  if (/ordonnance/i.test(d.type)) {
    const o = await prisma.ordonnance.create({ data: { enfantId: d.enfantId, medecinId: req.user.role === "medecin" ? req.user.id : null, etablissementId: d.etablissementId, documentId: d.id, dateFin: d.dateValidite } });
    ordonnanceId = o.id;
  }
  ok(res, { ...withUrl(d), ordonnanceId }, 201);
}));
router.get("/documents/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, etabParam(req));
  ok(res, (await prisma.document.findMany({ where: { etablissementId: etabParam(req) }, include: { enfant: enfantSel }, orderBy: { createdAt: "desc" } })).map(withUrl));
}));
router.get("/documents/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, (await prisma.document.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } })).map(withUrl));
}));
router.get("/documents/accessibles", auth(), ah(async (req, res) => {
  const scope = await enfantScope(req.user);
  const where = { ...(scope ? { enfantId: { in: scope } } : {}), ...(req.query.enfantId ? { enfantId: String(req.query.enfantId) } : {}), ...(req.query.type ? { type: String(req.query.type) } : {}) };
  if (scope && req.query.enfantId && !scope.includes(String(req.query.enfantId))) fail(403, "Permissions insuffisantes");
  ok(res, (await prisma.document.findMany({ where, include: { enfant: enfantSel }, orderBy: { createdAt: "desc" } })).map(withUrl));
}));
router.patch("/documents/:id/statut", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  const d = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!d) fail(404, "Document introuvable");
  if (d.etablissementId) await assertEtab(req.user, d.etablissementId);
  ok(res, withUrl(await prisma.document.update({ where: { id: d.id }, data: { statut: req.body.statut } })));
}));
router.delete("/documents/:id", auth(), ah(async (req, res) => {
  const d = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!d) fail(404, "Document introuvable");
  if (!isAdmin(req.user) && d.auteurId !== req.user.id) fail(403, "Permissions insuffisantes");
  await prisma.document.delete({ where: { id: d.id } });
  ok(res, { supprime: true });
}));

/** Pièces manquantes, rejetées, expirées ou expirant bientôt. */
router.get("/documents/alertes", auth(), ah(async (req, res) => {
  const horizon = new Date(Date.now() + Number(req.query.horizonJours ?? 30) * 864e5);
  let ids = await enfantScope(req.user);
  if (req.query.enfantId) ids = (ids ?? [String(req.query.enfantId)]).filter((x) => x === String(req.query.enfantId));
  const etabs = await etabScope(req.user);
  const enfants = await prisma.enfant.findMany({ where: { ...(ids ? { id: { in: ids } } : {}), ...(req.query.etablissementId ? { etablissementId: String(req.query.etablissementId) } : {}) }, select: { id: true, prenom: true, nom: true, etablissementId: true, pai: true } });
  const obligatoires = await prisma.documentObligatoire.findMany({ where: etabs ? { etablissementId: { in: etabs.length ? etabs : enfants.map((e) => e.etablissementId).filter(Boolean) } } : {} });
  const docs = await prisma.document.findMany({ where: { enfantId: { in: enfants.map((e) => e.id) } } });
  const out = [];
  for (const e of enfants) {
    const requis = obligatoires.filter((o) => o.etablissementId === e.etablissementId).map((o) => o.type);
    if (e.pai) requis.push("PAI");
    for (const type of [...new Set(requis)]) {
      const d = docs.filter((x) => x.enfantId === e.id && x.type.toLowerCase() === type.toLowerCase()).sort((a, b) => +b.createdAt - +a.createdAt)[0];
      const enfant = { id: e.id, _id: e.id, prenom: e.prenom, nom: e.nom };
      if (!d) out.push({ id: `${e.id}-${type}`, enfant, type, motif: "manquant", dateValidite: null, documentId: null });
      else if (d.statut === "rejete") out.push({ id: d.id, enfant, type, motif: "rejete", dateValidite: d.dateValidite, documentId: d.id });
      else if (d.dateValidite && d.dateValidite < new Date()) out.push({ id: d.id, enfant, type, motif: "expire", dateValidite: d.dateValidite, documentId: d.id });
      else if (d.dateValidite && d.dateValidite < horizon) out.push({ id: d.id, enfant, type, motif: "expiration_proche", dateValidite: d.dateValidite, documentId: d.id });
    }
  }
  ok(res, out);
}));

export default router;
