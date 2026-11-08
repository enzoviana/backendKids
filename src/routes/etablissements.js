import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma, ok, fail, ah, required, auth, roles, isAdmin, fullName } from '../lib/core.js';
import { assertEtab, etabScope } from '../lib/access.js';
import { DEFAULT_SECURITE, effectiveSecurity, getGlobalSecurity, normalizePlages } from '../lib/security-defaults.js';
import { signFile } from '../lib/services.js';
import { ensureDefaultDocuments } from '../lib/documents-obligatoires.js';
import { persistUpload } from '../lib/file-store.js';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname)) }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /image\/(jpeg|png|webp)/.test(f.mimetype)),
});

async function geocode(adresse) {
  if (!adresse) return {};
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(adresse)}`);
    const f = (await r.json()).features?.[0];
    if (!f) return {};
    return { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0], codePostal: f.properties.postcode, ville: f.properties.city };
  } catch { return {}; }
}
const pick = (b) => ({
  nom: b.nom, description: b.description, horairesOuverture: b.horairesOuverture,
  adresse: b.adresse, codePostal: b.codePostal, ville: b.ville, telephone: b.telephone, email: b.email,
  capacite: b.capacite != null ? Number(b.capacite) : undefined,
  latitude: b.latitude != null && b.latitude !== "" ? Number(b.latitude) : undefined,
  longitude: b.longitude != null && b.longitude !== "" ? Number(b.longitude) : undefined,
});

router.get("/", auth(), ah(async (req, res) => {
  const scope = await etabScope(req.user);
  const where = scope ? { id: { in: scope } } : {};
  // Les annuaires (crèche → RSAI, médecin) ont besoin des noms : tout utilisateur connecté voit la liste.
  const e = await prisma.etablissement.findMany({ where: isAdmin(req.user) || req.user.role === "medecin" || req.user.role === "parent" ? {} : where, orderBy: { nom: "asc" }, include: { _count: { select: { enfants: true } } } });
  ok(res, e.map((x) => ({ ...x, nbEnfants: x._count.enfants })));
}));

router.post("/", auth(), roles(), ah(async (req, res) => {
  required(req.body, ["nom"]);
  const d = pick(req.body);
  if (d.latitude == null) Object.assign(d, { ...(await geocode([d.adresse, d.codePostal, d.ville].filter(Boolean).join(" "))), ...Object.fromEntries(Object.entries(d).filter(([, v]) => v != null)) });
  const created = await prisma.etablissement.create({ data: d });
  await ensureDefaultDocuments(prisma, created.id);
  ok(res, created, 201);
}));

router.get("/:etablissementId", auth(), ah(async (req, res) => {
  const e = await prisma.etablissement.findUnique({ where: { id: req.params.etablissementId }, include: { sections: true, users: { select: { id: true, prenom: true, nom: true, role: true, email: true } } } });
  if (!e) fail(404, "Établissement introuvable");
  ok(res, e);
}));

router.put("/:etablissementId", auth(), roles("creche"), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const d = pick(req.body);
  if (d.adresse && d.latitude == null) Object.assign(d, await geocode(d.adresse));
  ok(res, await prisma.etablissement.update({ where: { id: req.params.etablissementId }, data: d }));
}));
router.post("/:etablissementId/photo", auth(), roles("creche"), upload.single("photo"), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  if (!req.file) fail(400, "Champs manquants : photo (JPG, PNG ou WebP ≤ 2 Mo)");
  await persistUpload(req.file);
  const photoUrl = signFile(req.file.filename, 3600 * 24 * 365);
  await prisma.etablissement.update({ where: { id: req.params.etablissementId }, data: { photoUrl } });
  ok(res, { photoUrl });
}));
router.delete("/:etablissementId/photo", auth(), roles("creche"), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  await prisma.etablissement.update({ where: { id: req.params.etablissementId }, data: { photoUrl: null } });
  ok(res, { photoUrl: null });
}));
router.delete("/:etablissementId", auth(), roles(), ah(async (req, res) => {
  await prisma.etablissement.delete({ where: { id: req.params.etablissementId } });
  ok(res, { supprime: true });
}));

router.get("/:etablissementId/stats", auth(), ah(async (req, res) => {
  const id = req.params.etablissementId;
  await assertEtab(req.user, id);
  const [enfants, sections, personnel, documents, traitements] = await Promise.all([
    prisma.enfant.count({ where: { etablissementId: id } }),
    prisma.section.count({ where: { etablissementId: id } }),
    prisma.personnel.count({ where: { etablissementId: id } }),
    prisma.document.count({ where: { etablissementId: id } }),
    prisma.medicament.count({ where: { etablissementId: id, statut: "en_cours" } }),
  ]);
  const e = await prisma.etablissement.findUnique({ where: { id } });
  ok(res, { enfants, sections, personnel, documents, traitements, capacite: e?.capacite ?? 0, tauxOccupation: e?.capacite ? Math.round((enfants / e.capacite) * 100) : 0 });
}));

router.get("/:etablissementId/sante", auth(), ah(async (req, res) => {
  const id = req.params.etablissementId;
  await assertEtab(req.user, id);
  const enfants = await prisma.enfant.findMany({ where: { etablissementId: id }, include: { vaccins: true } });
  const traitementsEnCours = await prisma.medicament.count({ where: { etablissementId: id, statut: "en_cours" } });
  const vaccinsAJour = enfants.filter((e) => e.vaccins.length && e.vaccins.every((v) => !v.rappel || v.rappel > new Date())).length;
  const M = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const ids = enfants.map((e) => e.id);
  const [diags, alertes] = await Promise.all([
    prisma.diagnostic.findMany({ where: { enfantId: { in: ids } }, select: { createdAt: true } }),
    prisma.alerteSymptome.findMany({ where: { etablissementId: id }, select: { createdAt: true } }),
  ]);
  ok(res, {
    vaccinsAJour: enfants.length ? Math.round((vaccinsAJour / enfants.length) * 100) : 0,
    allergiques: enfants.filter((e) => e.allergies.length).length, pai: enfants.filter((e) => e.pai).length, traitementsEnCours,
    evolution: M.map((mois, i) => ({ mois, consultations: diags.filter((d) => d.createdAt.getMonth() === i).length, alertes: alertes.filter((d) => d.createdAt.getMonth() === i).length })),
  });
}));

// Sécurité & géorepérage
router.get("/:etablissementId/securite", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const e = await prisma.etablissement.findUnique({ where: { id: req.params.etablissementId } });
  if (!e) fail(404, "Établissement introuvable");
  const defauts = await getGlobalSecurity(prisma);
  ok(res, { ...e, etablissementId: e.id, defauts, effectif: effectiveSecurity(e, defauts) });
}));
router.put("/:etablissementId/securite", auth(), roles("creche"), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const b = req.body;
  const defautsActuels = await getGlobalSecurity(prisma);

  if (b.utiliserDefauts === true || b.securitePersonnalisee === false) {
    const e = await prisma.etablissement.update({ where: { id: req.params.etablissementId }, data: { securitePersonnalisee: false } });
    return ok(res, { ...e, etablissementId: e.id, defauts: defautsActuels, effectif: effectiveSecurity(e, defautsActuels) });
  }

  const rayon = b.rayonMetres != null ? Number(b.rayonMetres) : undefined;
  if (rayon != null && (!Number.isFinite(rayon) || rayon < 10 || rayon > 5000)) fail(400, "Le rayon doit être compris entre 10 et 5000 mètres");
  const plages = b.plagesHoraires !== undefined ? normalizePlages(b.plagesHoraires) : undefined;

  const d = {
    securitePersonnalisee: true,
    rayonMetres: rayon,
    blocageHorsZone: b.blocageHorsZone,
    plagesHoraires: plages,
    ipsAutorisees: b.ipsAutorisees,
    adresse: b.adresse,
    latitude: b.latitude != null ? Number(b.latitude) : undefined,
    longitude: b.longitude != null ? Number(b.longitude) : undefined,
  };
  if (d.adresse && d.latitude == null) Object.assign(d, await geocode(d.adresse));
  const e = await prisma.etablissement.update({ where: { id: req.params.etablissementId }, data: d });
  const defauts = await getGlobalSecurity(prisma);
  ok(res, { ...e, etablissementId: e.id, defauts, effectif: effectiveSecurity(e, defauts) });
}));

// Avis d'une RSAI sur un établissement
router.post("/:etablissementId/avis-rsai", auth(), roles("rsai"), ah(async (req, res) => {
  const note = Number(req.body.note);
  if (!(note >= 1 && note <= 5)) fail(400, "La note doit être comprise entre 1 et 5");
  const e = await prisma.etablissement.findUnique({ where: { id: req.params.etablissementId } });
  if (!e) fail(404, "Établissement introuvable");
  if (req.user.role === "rsai" && !(await prisma.affectation.findFirst({ where: { rsaiId: req.user.id, etablissementId: e.id } }))) fail(403, "Vous n'êtes pas affectée à cet établissement");
  const a = await prisma.avis.upsert({
    where: { auteurId_cibleType_cibleId: { auteurId: req.user.id, cibleType: "etablissement", cibleId: e.id } },
    update: { note, commentaire: req.body.commentaire },
    create: { auteurId: req.user.id, auteurNom: fullName(req.user), auteurRole: req.user.role, cibleType: "etablissement", cibleId: e.id, cibleNom: e.nom, note, commentaire: req.body.commentaire },
  });
  const g = await prisma.avis.aggregate({ where: { cibleType: "etablissement", cibleId: e.id }, _avg: { note: true }, _count: true });
  ok(res, { id: a.id, noteMoyenne: +(g._avg.note ?? 0).toFixed(1), nbAvis: g._count }, 201);
}));

export default router;
