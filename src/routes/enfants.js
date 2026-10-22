import express from 'express';
import QRCode from 'qrcode';
import { prisma, ok, fail, ah, required, auth, roles, isAdmin, genCode, toDate, logSecu, notify, fullName } from '../lib/core.js';
import { assertEnfant, assertEtab, enfantScope } from '../lib/access.js';

const router = express.Router();

const fields = (b) => ({
  prenom: b.prenom, nom: b.nom, dateNaissance: toDate(b.dateNaissance), sexe: b.sexe,
  etablissementId: b.etablissementId || undefined, sectionId: b.sectionId || undefined,
  groupeSanguin: b.groupeSanguin, pai: b.pai != null ? !!b.pai : undefined,
  allergies: Array.isArray(b.allergies) ? b.allergies : typeof b.allergies === "string" ? b.allergies.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  antecedents: Array.isArray(b.antecedents) ? b.antecedents : undefined,
});

// ---------- /enfants ----------
router.get("/enfants", auth(), ah(async (req, res) => {
  const scope = await enfantScope(req.user);
  ok(res, await prisma.enfant.findMany({ where: scope ? { id: { in: scope } } : {}, include: { etablissement: { select: { id: true, nom: true } }, section: true }, orderBy: { prenom: "asc" } }));
}));
router.get("/enfants/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  ok(res, await prisma.enfant.findMany({ where: { etablissementId: req.params.etablissementId }, include: { section: true }, orderBy: { prenom: "asc" } }));
}));
router.post("/enfants", auth(), roles("creche", "parent"), ah(async (req, res) => {
  required(req.body, ["prenom", "nom"]);
  const d = fields(req.body);
  if (req.user.role === "creche") d.etablissementId = req.user.etablissementId;
  const e = await prisma.enfant.create({ data: { ...d, codeLiaison: genCode(d.prenom) } });
  if (req.user.role === "parent") await prisma.liaison.create({ data: { enfantId: e.id, userId: req.user.id, role: "parent", source: "creation" } });
  ok(res, e, 201);
}));
router.post("/enfants/lier-code", auth(), ah(async (req, res) => {
  required(req.body, ["code"]);
  const e = await prisma.enfant.findUnique({ where: { codeLiaison: String(req.body.code).trim().toUpperCase() } });
  if (!e) fail(404, "Code de liaison invalide");
  await prisma.liaison.upsert({ where: { enfantId_userId: { enfantId: e.id, userId: req.user.id } }, update: {}, create: { enfantId: e.id, userId: req.user.id, role: req.user.role, source: "code" } });
  ok(res, { id: e.id, prenom: e.prenom, nom: e.nom });
}));
router.get("/enfants/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await logSecu(req, "consultation_dossier", { enfantId: req.params.enfantId });
  ok(res, await prisma.enfant.findUnique({ where: { id: req.params.enfantId }, include: { etablissement: true, section: true } }));
}));
router.put("/enfants/:enfantId", auth(), roles("creche", "parent", "medecin"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await logSecu(req, "modification_dossier", { enfantId: req.params.enfantId });
  ok(res, await prisma.enfant.update({ where: { id: req.params.enfantId }, data: fields(req.body) }));
}));
router.delete("/enfants/:enfantId", auth(), roles("creche"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await prisma.enfant.delete({ where: { id: req.params.enfantId } });
  ok(res, { supprime: true });
}));
router.patch("/enfants/:enfantId/dossier-medical", auth(), roles("parent", "medecin", "creche"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const { groupeSanguin, allergies, antecedents, pai } = fields(req.body);
  await logSecu(req, "modification_dossier", { enfantId: req.params.enfantId });
  ok(res, await prisma.enfant.update({ where: { id: req.params.enfantId }, data: { groupeSanguin, allergies, antecedents, pai } }));
}));
router.get("/enfants/:enfantId/qrcode", auth(), ah(async (req, res) => {
  const e = await assertEnfant(req.user, req.params.enfantId);
  ok(res, { code: e.codeLiaison, qrCodeUrl: await QRCode.toDataURL(e.codeLiaison) });
}));
router.post("/enfants/:enfantId/regenerer-code", auth(), roles("creche"), ah(async (req, res) => {
  const e = await assertEnfant(req.user, req.params.enfantId);
  const u = await prisma.enfant.update({ where: { id: e.id }, data: { codeLiaison: genCode(e.prenom) } });
  ok(res, { code: u.codeLiaison, qrCodeUrl: await QRCode.toDataURL(u.codeLiaison) });
}));

// ---------- Vaccins ----------
router.get("/enfants/:enfantId/vaccins", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const v = await prisma.vaccin.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { date: "asc" } });
  const meds = await prisma.user.findMany({ where: { id: { in: v.map((x) => x.medecinId).filter(Boolean) } }, select: { id: true, prenom: true, nom: true } });
  ok(res, v.map((x) => ({ ...x, medecin: meds.find((m) => m.id === x.medecinId) ?? null })));
}));
router.post("/enfants/:enfantId/vaccins", auth(), roles("medecin", "parent", "rsai"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  required(req.body, ["nom", "date"]);
  const b = req.body;
  ok(res, await prisma.vaccin.create({ data: { enfantId: req.params.enfantId, nom: b.nom, dose: Number(b.dose ?? 1), date: new Date(b.date), medecinId: b.medecinId || (req.user.role === "medecin" ? req.user.id : null), lot: b.lot, rappel: toDate(b.rappel) } }), 201);
}));
router.delete("/enfants/:enfantId/vaccins/:vaccinId", auth(), roles("medecin"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await prisma.vaccin.delete({ where: { id: req.params.vaccinId } });
  ok(res, { supprime: true });
}));

// ---------- Consentements ----------
router.get("/enfants/:enfantId/consentements", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const c = await prisma.consentement.findMany({ where: { enfantId: req.params.enfantId } });
  const u = await prisma.user.findMany({ where: { id: { in: c.map((x) => x.signeParId).filter(Boolean) } }, select: { id: true, prenom: true, nom: true } });
  ok(res, c.map((x) => ({ ...x, signePar: u.find((y) => y.id === x.signeParId) ?? null })));
}));
router.put("/enfants/:enfantId/consentements/:type", auth(), roles("parent"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const data = { accorde: !!req.body.accorde, signature: req.body.signature, signeParId: req.user.id, date: new Date() };
  ok(res, await prisma.consentement.upsert({ where: { enfantId_type: { enfantId: req.params.enfantId, type: req.params.type } }, update: data, create: { ...data, enfantId: req.params.enfantId, type: req.params.type } }));
}));

// ---------- Notes crèche / médecin ----------
const PROS = ["medecin", "rsai", "admin", "superadmin", "developpeur"];
router.get("/enfants/:enfantId/notes", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const where = { enfantId: req.params.enfantId, ...(PROS.includes(req.user.role) ? {} : { visibilite: "publique" }) };
  ok(res, await prisma.note.findMany({ where, orderBy: { createdAt: "desc" } }));
}));
router.post("/enfants/:enfantId/notes", auth(), roles("creche", "medecin", "rsai"), ah(async (req, res) => {
  const e = await assertEnfant(req.user, req.params.enfantId);
  required(req.body, ["contenu"]);
  const visibilite = req.body.visibilite === "medicale" && req.user.role !== "creche" ? "medicale" : "publique";
  const n = await prisma.note.create({ data: { enfantId: e.id, auteurId: req.user.id, auteurNom: fullName(req.user), auteurRole: req.user.role, visibilite, destinataire: req.body.destinataire, contenu: req.body.contenu } });
  if (req.body.destinataire === "creche" && e.etablissementId) {
    const staff = await prisma.user.findMany({ where: { etablissementId: e.etablissementId, role: "creche" }, select: { id: true } });
    await notify(staff.map((s) => s.id), "Nouvelle note", `${fullName(req.user)} a ajouté une note pour ${e.prenom}`, `/enfants/${e.id}`);
  }
  ok(res, n, 201);
}));

// ---------- Échanges de documents ----------
router.get("/enfants/:enfantId/echanges-documents", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.echangeDocument.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } }));
}));
router.post("/enfants/:enfantId/echanges-documents", auth(), roles("creche", "medecin", "parent"), ah(async (req, res) => {
  const e = await assertEnfant(req.user, req.params.enfantId);
  required(req.body, ["action", "destinataire", "type"]);
  const b = req.body;
  if (b.action === "envoi") {
    required(b, ["documentId"]);
    const d = await prisma.document.findUnique({ where: { id: b.documentId } });
    if (!d || d.enfantId !== e.id) fail(400, "Document introuvable pour cet enfant");
  }
  const x = await prisma.echangeDocument.create({ data: { enfantId: e.id, expediteurId: req.user.id, expediteurRole: req.user.role, destinataire: b.destinataire, action: b.action, type: b.type, message: b.message, documentId: b.documentId, demandeId: b.demandeId, echeance: toDate(b.echeance), statut: b.action === "envoi" ? "envoye" : "en_attente" } });
  if (b.demandeId) await prisma.echangeDocument.update({ where: { id: b.demandeId }, data: { statut: "recu" } }).catch(() => {});
  const cibles = b.destinataire === "creche" && e.etablissementId
    ? await prisma.user.findMany({ where: { etablissementId: e.etablissementId, role: "creche" }, select: { id: true } })
    : (await prisma.liaison.findMany({ where: { enfantId: e.id, role: b.destinataire }, select: { userId: true } })).map((l) => ({ id: l.userId }));
  await notify(cibles.map((c) => c.id), b.action === "demande" ? "Document demandé" : "Document reçu", `${b.type} — ${e.prenom}`, `/enfants/${e.id}`);
  ok(res, x, 201);
}));

// ---------- Liaisons ----------
router.get("/liaisons/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.liaison.findMany({ where: { enfantId: req.params.enfantId }, include: { user: { select: { id: true, prenom: true, nom: true, email: true, role: true } } } }));
}));
router.get("/liaisons", auth(), roles(), ah(async (req, res) => {
  const { enfantId, userId, role } = req.query;
  ok(res, await prisma.liaison.findMany({ where: { enfantId: enfantId || undefined, userId: userId || undefined, role: role || undefined }, include: { enfant: { select: { id: true, prenom: true, nom: true } }, user: { select: { id: true, prenom: true, nom: true, email: true } } }, orderBy: { createdAt: "desc" } }));
}));
router.post("/liaisons", auth(), roles("creche"), ah(async (req, res) => {
  const enfantId = req.body.enfantId ?? req.body.enfant;
  required({ enfantId, role: req.body.role }, ["enfantId", "role"]);
  await assertEnfant(req.user, enfantId);
  const user = req.body.userId ? await prisma.user.findUnique({ where: { id: req.body.userId } }) : await prisma.user.findUnique({ where: { email: req.body.email ?? "" } });
  if (!user) fail(404, "Utilisateur introuvable (e-mail ou identifiant)");
  ok(res, await prisma.liaison.upsert({ where: { enfantId_userId: { enfantId, userId: user.id } }, update: { role: req.body.role }, create: { enfantId, userId: user.id, role: req.body.role, source: isAdmin(req.user) ? "admin" : "creche" } }), 201);
}));
router.delete("/liaisons/:liaisonId", auth(), roles("creche"), ah(async (req, res) => {
  const l = await prisma.liaison.findUnique({ where: { id: req.params.liaisonId } });
  if (!l) fail(404, "Liaison introuvable");
  await assertEnfant(req.user, l.enfantId);
  await prisma.liaison.delete({ where: { id: l.id } });
  ok(res, { supprime: true });
}));

export default router;
