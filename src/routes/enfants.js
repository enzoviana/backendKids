import express from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma, ok, fail, ah, required, auth, roles, isAdmin, genCode, toDate, logSecu, notify, fullName } from '../lib/core.js';
import { assertEnfant, assertEtab, enfantScope } from '../lib/access.js';
import { sendEmail } from '../lib/services.js';

const router = express.Router();

const fields = (b) => ({
  prenom: b.prenom, nom: b.nom, dateNaissance: toDate(b.dateNaissance), sexe: b.sexe,
  etablissementId: b.etablissementId || undefined, sectionId: b.sectionId || undefined,
  groupeSanguin: b.groupeSanguin, pai: b.pai != null ? !!b.pai : undefined,
  poids: b.poids !== undefined && b.poids !== null && b.poids !== "" ? Number(b.poids) : undefined,
  taille: b.taille !== undefined && b.taille !== null && b.taille !== "" ? Number(b.taille) : undefined,
  allergies: Array.isArray(b.allergies) ? b.allergies : typeof b.allergies === "string" ? b.allergies.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
  antecedents: Array.isArray(b.antecedents) ? b.antecedents : undefined,
});

const IDENTITY_FIELDS = ["prenom", "nom", "dateNaissance", "sexe", "poids", "taille"];
const MEDICAL_FIELDS = ["groupeSanguin", "pai", "allergies", "antecedents"];

/**
 * Champs qu'un rôle peut modifier via PUT /enfants/:id.
 * - parent / médecin : identité, mesures et données médicales, jamais l'établissement ni la section.
 * - crèche : identité, mesures et section de SON établissement ; jamais les données médicales.
 * - admin / développeur : tous les champs (supervision), section validée plus bas.
 */
function updateFieldsFor(user, body) {
  const d = fields(body);
  if (isAdmin(user)) return d;
  if (user.role === "creche") {
    const allowed = {};
    for (const key of [...IDENTITY_FIELDS, "sectionId"]) if (d[key] !== undefined) allowed[key] = d[key];
    return allowed;
  }
  const allowed = {};
  for (const key of [...IDENTITY_FIELDS, ...MEDICAL_FIELDS]) if (d[key] !== undefined) allowed[key] = d[key];
  return allowed;
}

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
  const enfant = await assertEnfant(req.user, req.params.enfantId);
  const data = updateFieldsFor(req.user, req.body);
  if (data.sectionId) {
    const section = await prisma.section.findUnique({ where: { id: data.sectionId }, select: { etablissementId: true } });
    const etablissementAttendu = enfant.etablissementId ?? req.user.etablissementId;
    if (!section || section.etablissementId !== etablissementAttendu) fail(400, "Section invalide pour cet enfant");
  }
  await logSecu(req, "modification_dossier", { enfantId: req.params.enfantId });
  ok(res, await prisma.enfant.update({ where: { id: req.params.enfantId }, data }));
}));
router.delete("/enfants/:enfantId", auth(), roles("creche"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await prisma.enfant.delete({ where: { id: req.params.enfantId } });
  ok(res, { supprime: true });
}));
router.patch("/enfants/:enfantId/dossier-medical", auth(), roles("parent", "medecin"), ah(async (req, res) => {
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
const INVITABLE_ROLES = ["parent", "medecin"];
const frontendBase = () => (process.env.FRONTEND_URL || "https://kidsmedia.vercel.app").replace(/\/+$/, "");
const inviteLink = (email, token) => `${frontendBase()}/app?page=register&email=${encodeURIComponent(email)}&invitation=${encodeURIComponent(token)}`;

function invitationHtml({ prenom, enfantNom, etablissementNom, role, link }) {
  const roleLabel = role === "medecin" ? "médecin" : "parent";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937">
    <h1>Kids'Med IA — invitation</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>La crèche${etablissementNom ? ` <strong>${etablissementNom}</strong>` : ""} vous invite à rejoindre le dossier de <strong>${enfantNom}</strong> en tant que ${roleLabel}.</p>
    <p>Créez votre compte avec cette adresse e-mail pour accéder au dossier :</p>
    <p><a href="${link}" style="display:inline-block;background:#0095ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Créer mon compte</a></p>
    <p>Ce lien est valable 7 jours. Si vous avez déjà un compte, connectez-vous puis saisissez le code de liaison fourni par la crèche.</p>
    <p style="font-size:12px;color:#6b7280">Si vous n'êtes pas concerné, ignorez cet e-mail.</p>
  </body></html>`;
}

router.get("/liaisons/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const [liens, invitations] = await Promise.all([
    prisma.liaison.findMany({ where: { enfantId: req.params.enfantId }, include: { user: { select: { id: true, prenom: true, nom: true, email: true, role: true } } } }),
    prisma.liaisonInvitation.findMany({ where: { enfantId: req.params.enfantId, statut: "en_attente", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  ok(res, [
    ...liens,
    ...invitations.map((i) => ({
      _id: `inv_${i.id}`,
      id: i.id,
      invitation: true,
      role: i.role,
      statut: i.statut,
      expiresAt: i.expiresAt,
      user: { email: i.email, prenom: i.email.split("@")[0], nom: "" },
    })),
  ]);
}));
router.get("/liaisons", auth(), roles(), ah(async (req, res) => {
  const { enfantId, userId, role } = req.query;
  ok(res, await prisma.liaison.findMany({ where: { enfantId: enfantId || undefined, userId: userId || undefined, role: role || undefined }, include: { enfant: { select: { id: true, prenom: true, nom: true } }, user: { select: { id: true, prenom: true, nom: true, email: true } } }, orderBy: { createdAt: "desc" } }));
}));
router.post("/liaisons", auth(), roles("creche"), ah(async (req, res) => {
  const enfantId = req.body.enfantId ?? req.body.enfant;
  const role = String(req.body.role ?? "").trim();
  required({ enfantId, role }, ["enfantId", "role"]);
  const enfant = await assertEnfant(req.user, enfantId);
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const user = req.body.userId
    ? await prisma.user.findUnique({ where: { id: req.body.userId } })
    : email
      ? await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
      : null;

  if (!user) {
    // Pas de compte : on prépare une invitation nominative. Le parent ou le médecin
    // pourra s'inscrire avec cette adresse et sera automatiquement lié au dossier.
    if (!email) fail(404, "Utilisateur introuvable (e-mail ou identifiant)");
    if (!INVITABLE_ROLES.includes(role)) {
      fail(400, "Ce rôle doit être créé par l'administrateur. Seuls un parent ou un médecin peuvent être invités par e-mail.");
    }
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 864e5);
    const invitation = await prisma.liaisonInvitation.upsert({
      where: { enfantId_email_role: { enfantId, email, role } },
      update: { token, statut: "en_attente", expiresAt, acceptedAt: null, createdById: req.user.id },
      create: { enfantId, email, role, token, expiresAt, createdById: req.user.id },
    });
    const etablissement = enfant.etablissementId ? await prisma.etablissement.findUnique({ where: { id: enfant.etablissementId }, select: { nom: true } }) : null;
    const link = inviteLink(email, token);
    let emailSent = false;
    try {
      await sendEmail(
        email,
        `Invitation à rejoindre le dossier de ${enfant.prenom}`,
        invitationHtml({ enfantNom: fullName(enfant), etablissementNom: etablissement?.nom, role, link }),
      );
      emailSent = true;
    } catch (err) {
      console.error("Invitation liaison : envoi e-mail impossible", err?.message ?? err);
    }
    return ok(res, { id: invitation.id, invitation: true, email, role, expiresAt, emailSent, lien: link }, 201);
  }

  const lien = await prisma.liaison.upsert({
    where: { enfantId_userId: { enfantId, userId: user.id } },
    update: { role },
    create: { enfantId, userId: user.id, role, source: isAdmin(req.user) ? "admin" : "creche" },
  });
  await prisma.liaisonInvitation.updateMany({
    where: { enfantId, email: { equals: user.email, mode: "insensitive" }, role, statut: "en_attente" },
    data: { statut: "acceptee", acceptedAt: new Date() },
  });
  ok(res, lien, 201);
}));
router.delete("/liaisons/invitations/:invitationId", auth(), roles("creche"), ah(async (req, res) => {
  const inv = await prisma.liaisonInvitation.findUnique({ where: { id: req.params.invitationId } });
  if (!inv) fail(404, "Invitation introuvable");
  await assertEnfant(req.user, inv.enfantId);
  await prisma.liaisonInvitation.delete({ where: { id: inv.id } });
  ok(res, { supprime: true });
}));
router.delete("/liaisons/:liaisonId", auth(), roles("creche"), ah(async (req, res) => {
  const l = await prisma.liaison.findUnique({ where: { id: req.params.liaisonId } });
  if (!l) fail(404, "Liaison introuvable");
  await assertEnfant(req.user, l.enfantId);
  await prisma.liaison.delete({ where: { id: l.id } });
  ok(res, { supprime: true });
}));

export default router;
