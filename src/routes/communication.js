// Messagerie, notifications, diagnostics IA, alertes symptômes.
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { prisma, ok, fail, ah, required, auth, roles, notify, fullName } = require("../lib/core");
const { assertEnfant, enfantScope, assertEtab } = require("../lib/access");
const { UPLOAD_DIR } = require("../lib/services");

const userSel = { select: { id: true, prenom: true, nom: true, email: true, role: true } };

// ---------- Messages ----------
router.get("/messages/recus", auth(), ah(async (req, res) => ok(res, await prisma.message.findMany({ where: { destinataireId: req.user.id }, include: { expediteur: userSel }, orderBy: { createdAt: "desc" } }))));
router.get("/messages/envoyes", auth(), ah(async (req, res) => ok(res, await prisma.message.findMany({ where: { expediteurId: req.user.id }, include: { destinataire: userSel }, orderBy: { createdAt: "desc" } }))));
router.get("/messages/destinataires", auth(), ah(async (req, res) => ok(res, await prisma.user.findMany({ where: { actif: true, id: { not: req.user.id } }, select: { id: true, prenom: true, nom: true, role: true } }))));
router.post("/messages", auth(), ah(async (req, res) => {
  required(req.body, ["destinataireId", "contenu"]);
  const dest = await prisma.user.findUnique({ where: { id: req.body.destinataireId } });
  if (!dest) fail(404, "Destinataire introuvable");
  if (req.body.enfantId) await assertEnfant(req.user, req.body.enfantId);
  const m = await prisma.message.create({ data: { expediteurId: req.user.id, destinataireId: dest.id, sujet: req.body.sujet ?? "(sans objet)", contenu: req.body.contenu, enfantId: req.body.enfantId || null } });
  await notify([dest.id], "Nouveau message", `${fullName(req.user)} : ${m.sujet}`, "/messagerie");
  ok(res, m, 201);
}));
router.patch("/messages/:id/lu", auth(), ah(async (req, res) => {
  const m = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!m || m.destinataireId !== req.user.id) fail(404, "Message introuvable");
  ok(res, await prisma.message.update({ where: { id: m.id }, data: { lu: true } }));
}));
router.delete("/messages/:id", auth(), ah(async (req, res) => {
  const m = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!m || (m.destinataireId !== req.user.id && m.expediteurId !== req.user.id)) fail(404, "Message introuvable");
  await prisma.message.delete({ where: { id: m.id } });
  ok(res, { supprime: true });
}));

// ---------- Notifications ----------
router.get("/notifications", auth(), ah(async (req, res) => ok(res, await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100 }))));
router.get("/notifications/count-unread", auth(), ah(async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.user.id, lue: false } });
  ok(res, { count });
}));
router.patch("/notifications/:id/lue", auth(), ah(async (req, res) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { lue: true } });
  ok(res, { lue: true });
}));
router.patch("/notifications/tout-lire", auth(), ah(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id }, data: { lue: true } });
  ok(res, { lue: true });
}));

// ---------- Diagnostics IA ----------
const RULES = [
  { nom: "Bronchiolite", s: ["toux", "difficultes_respiratoires", "sifflement", "fievre"] },
  { nom: "Gastro-entérite", s: ["vomissements", "diarrhee", "fievre", "douleur_abdominale"] },
  { nom: "Otite", s: ["douleur_oreille", "fievre", "irritabilite"] },
  { nom: "Varicelle", s: ["boutons", "demangeaisons", "fievre"] },
  { nom: "Rhinopharyngite", s: ["nez_qui_coule", "toux", "fievre"] },
  { nom: "Réaction allergique", s: ["urticaire", "gonflement", "difficultes_respiratoires"] },
];
function analyse(symptomes, temperature) {
  const set = new Set(symptomes.map((x) => String(x).toLowerCase()));
  const diagnostics = RULES.map((r) => ({ nom: r.nom, confiance: +((r.s.filter((x) => set.has(x)).length / r.s.length) * 100).toFixed(1) }))
    .filter((d) => d.confiance > 0).sort((a, b) => b.confiance - a.confiance);
  const top = diagnostics[0];
  const grave = set.has("difficultes_respiratoires") || set.has("gonflement") || (temperature ?? 0) >= 40;
  const niveauRisque = grave ? "eleve" : (temperature ?? 0) >= 38.5 || (top?.confiance ?? 0) > 70 ? "moyen" : "faible";
  return {
    diagnostics, diagnosticSuggere: top?.nom ?? "Indéterminé", confiance: top?.confiance ?? 0, niveauRisque,
    orientation: niveauRisque === "eleve" ? "urgence_15" : niveauRisque === "moyen" ? "consultation_24h" : "surveillance",
    conseils: niveauRisque === "eleve" ? ["Appeler le 15 immédiatement", "Ne pas laisser l'enfant seul"] : ["Surveiller la température", "Hydrater régulièrement", "Prévenir les parents"],
  };
}
const upload = multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname)) }), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/diagnostics/analyser", auth(), upload.single("photo"), ah(async (req, res) => {
  required(req.body, ["enfantId"]);
  const e = await assertEnfant(req.user, req.body.enfantId);
  let symptomes = req.body.symptomes ?? [];
  if (typeof symptomes === "string") { try { symptomes = JSON.parse(symptomes); } catch { symptomes = symptomes.split(","); } }
  const temperature = req.body.temperature ? Number(req.body.temperature) : null;
  const r = analyse(symptomes, temperature);
  const d = await prisma.diagnostic.create({ data: { enfantId: e.id, auteurId: req.user.id, symptomes, temperature, duree: req.body.duree, commentaire: req.body.commentaire, photoUrl: req.file?.filename, resultat: r.diagnostics, diagnosticSuggere: r.diagnosticSuggere, confiance: r.confiance, niveauRisque: r.niveauRisque, conseils: r.conseils, orientation: r.orientation } });
  if (r.niveauRisque !== "faible") {
    const l = await prisma.liaison.findMany({ where: { enfantId: e.id } });
    const staff = e.etablissementId ? await prisma.user.findMany({ where: { etablissementId: e.etablissementId, role: "creche" }, select: { id: true } }) : [];
    await notify([...l.map((x) => x.userId), ...staff.map((s) => s.id)], `Alerte santé — ${e.prenom}`, `${r.diagnosticSuggere} (risque ${r.niveauRisque})`, `/enfants/${e.id}`, "alerte");
  }
  ok(res, { ...d, enfant_id: d.enfantId, date_analyse: d.createdAt, symptoms_detectes: symptomes, diagnostics: r.diagnostics, diagnostic_suggere: r.diagnosticSuggere, niveau_confiance: r.confiance, niveau_risque: r.niveauRisque }, 201);
}));
router.get("/diagnostics", auth(), roles("rsai", "medecin", "creche"), ah(async (req, res) => {
  const scope = await enfantScope(req.user);
  const where = scope ? { enfantId: { in: scope } } : {};
  if (req.query.etablissementId) Object.assign(where, { enfant: { etablissementId: String(req.query.etablissementId) } });
  const d = await prisma.diagnostic.findMany({ where, include: { enfant: { select: { id: true, prenom: true, nom: true } } }, orderBy: { createdAt: "desc" }, take: Number(req.query.limit ?? 100) });
  ok(res, d.map((x) => ({ ...x, resultat: x.diagnosticSuggere })));
}));
router.get("/diagnostics/stats", auth(), ah(async (req, res) => {
  const scope = await enfantScope(req.user);
  const d = await prisma.diagnostic.findMany({ where: scope ? { enfantId: { in: scope } } : {}, select: { niveauRisque: true, confiance: true, retourMedecin: true } });
  const valides = d.filter((x) => x.retourMedecin);
  ok(res, { total: d.length, eleve: d.filter((x) => x.niveauRisque === "eleve").length, moyen: d.filter((x) => x.niveauRisque === "moyen").length, faible: d.filter((x) => x.niveauRisque === "faible").length,
    confianceMoyenne: d.length ? +(d.reduce((s, x) => s + x.confiance, 0) / d.length).toFixed(1) : 0,
    precision: valides.length ? Math.round((valides.filter((x) => x.retourMedecin?.exact).length / valides.length) * 100) : null });
}));
router.get("/diagnostics/enfant/:enfantId", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.diagnostic.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } }));
}));
router.post("/diagnostics/:diagnosticId/retour-medecin", auth(), roles("medecin"), ah(async (req, res) => {
  const d = await prisma.diagnostic.findUnique({ where: { id: req.params.diagnosticId } });
  if (!d) fail(404, "Diagnostic introuvable");
  await assertEnfant(req.user, d.enfantId);
  ok(res, await prisma.diagnostic.update({ where: { id: d.id }, data: { retourMedecin: { ...req.body, medecinId: req.user.id, date: new Date() } } }));
}));

// ---------- Alertes symptômes ----------
router.post("/alertes/symptome", auth(), roles("rsai", "creche"), ah(async (req, res) => {
  required(req.body, ["enfantId", "symptome"]);
  const e = await assertEnfant(req.user, req.body.enfantId);
  const a = await prisma.alerteSymptome.create({ data: { enfantId: e.id, etablissementId: e.etablissementId, symptome: req.body.symptome, gravite: req.body.gravite ?? "faible", auteurId: req.user.id } });
  const l = await prisma.liaison.findMany({ where: { enfantId: e.id } });
  await notify(l.map((x) => x.userId), `Symptôme signalé — ${e.prenom}`, req.body.symptome, "/parent", "alerte");
  ok(res, a, 201);
}));
router.get("/alertes/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const a = await prisma.alerteSymptome.findMany({ where: { etablissementId: req.params.etablissementId }, orderBy: { createdAt: "desc" }, take: 200 });
  const enf = await prisma.enfant.findMany({ where: { id: { in: a.map((x) => x.enfantId) } }, select: { id: true, prenom: true, nom: true } });
  ok(res, a.map((x) => ({ ...x, enfant: enf.find((e) => e.id === x.enfantId) })));
}));

module.exports = router;
