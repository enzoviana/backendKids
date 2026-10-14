const router = require("express").Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { prisma, ok, fail, ah, required, auth, roles, publicUser, isAdmin, fullName } = require("../lib/core");
const { UPLOAD_DIR, signFile } = require("../lib/services");

const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname)) }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /image\/(jpeg|png|webp)/.test(f.mimetype)),
});

// ---------- /users ----------
router.get("/users", auth(), roles(), ah(async (req, res) => {
  const where = req.query.role ? { role: String(req.query.role) } : {};
  const u = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, include: { etablissement: { select: { id: true, nom: true } } } });
  ok(res, u.map(publicUser));
}));

router.post("/users", auth(), roles(), ah(async (req, res) => {
  required(req.body, ["email", "role"]);
  { const { DEV, isDev } = require("../lib/core"); if (DEV.includes(req.body.role) && !isDev(req.user)) fail(403, "Seul un développeur peut créer un compte développeur"); }
  const { password, motDePasse, ...d } = req.body;
  const pwd = password || motDePasse || crypto.randomBytes(6).toString("base64url");
  const u = await prisma.user.create({
    data: {
      email: d.email, role: d.role, prenom: d.prenom ?? "", nom: d.nom ?? "", telephone: d.telephone,
      etablissementId: d.etablissementId || null, specialite: d.specialite, rpps: d.rpps, qualification: d.qualification,
      motDePasseHash: await bcrypt.hash(pwd, 10),
    },
  });
  ok(res, { ...publicUser(u), motDePasseTemporaire: password || motDePasse ? undefined : pwd }, 201);
}));

router.put("/auth/me", auth(), ah(async (req, res) => {
  const { prenom, nom, telephone } = req.body;
  ok(res, publicUser(await prisma.user.update({ where: { id: req.user.id }, data: { prenom, nom, telephone } })));
}));
router.get("/users/profile", auth(), ah(async (req, res) => ok(res, publicUser(req.user))));
router.put("/users/profile", auth(), ah(async (req, res) => {
  const { prenom, nom, telephone, specialite, adresseCabinet, qualification } = req.body;
  ok(res, publicUser(await prisma.user.update({ where: { id: req.user.id }, data: { prenom, nom, telephone, specialite, adresseCabinet, qualification } })));
}));

router.get("/users/export-data", auth(), ah(async (req, res) => {
  const id = req.user.id;
  const [messages, notifications, liaisons, logs] = await Promise.all([
    prisma.message.findMany({ where: { OR: [{ expediteurId: id }, { destinataireId: id }] } }),
    prisma.notification.findMany({ where: { userId: id } }),
    prisma.liaison.findMany({ where: { userId: id }, include: { enfant: true } }),
    prisma.logSecurite.findMany({ where: { userId: id } }),
  ]);
  ok(res, { profil: publicUser(req.user), messages, notifications, liaisons, logs, exporteLe: new Date() });
}));

router.post("/enfants/:enfantId/photo", auth(), upload.single("photo"), ah(async (req, res) => {
  if (!req.file) fail(400, "Champs manquants : photo (jpg/png/webp ≤ 2 Mo)");
  await require("../lib/access").assertEnfant(req.user, req.params.enfantId);
  const photoUrl = signFile(req.file.filename, 3600 * 24 * 365);
  await prisma.enfant.update({ where: { id: req.params.enfantId }, data: { photoUrl } });
  ok(res, { photoUrl });
}));

router.post("/users/me/avatar", auth(), upload.single("photo"), ah(async (req, res) => {
  if (!req.file) fail(400, "Champs manquants : photo (jpg/png/webp ≤ 2 Mo)");
  const avatarUrl = signFile(req.file.filename, 3600 * 24 * 365);
  await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl } });
  ok(res, { avatarUrl });
}));

router.put("/users/:userId/profile", auth(), roles(), ah(async (req, res) => {
  await guardTarget(req);
  const { password, motDePasseHash, id, ...data } = req.body;
  if (password) data.motDePasseHash = await bcrypt.hash(password, 10);
  ok(res, publicUser(await prisma.user.update({ where: { id: req.params.userId }, data })));
}));
// Seul un développeur peut modifier un compte développeur ; personne ne se suspend soi-même.
async function guardTarget(req) {
  const t = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!t) fail(404, "Utilisateur introuvable");
  const { DEV, isDev } = require("../lib/core");
  if (DEV.includes(t.role) && !isDev(req.user)) fail(403, "Seul un développeur peut modifier ce compte");
  if (req.body?.role && DEV.includes(req.body.role) && !isDev(req.user)) fail(403, "Seul un développeur peut attribuer ce rôle");
  return t;
}
router.post("/users/:userId/reset-password", auth(), roles(), ah(async (req, res) => {
  const t = await guardTarget(req);
  const pwd = crypto.randomBytes(6).toString("base64url");
  await prisma.user.update({ where: { id: t.id }, data: { motDePasseHash: await bcrypt.hash(pwd, 10) } });
  const { sendEmail } = require("../lib/services");
  await sendEmail(t.email, "Votre nouveau mot de passe Kids'Med", "mot-de-passe-oublie", { prenom: t.prenom, code: pwd }, `Votre nouveau mot de passe : ${pwd}`).catch(() => {});
  ok(res, { envoye: true });
}));
router.patch("/users/:userId/status", auth(), roles(), ah(async (req, res) => {
  await guardTarget(req);
  if (req.params.userId === req.user.id) fail(400, "Vous ne pouvez pas suspendre votre propre compte");
  const actif = req.body.actif ?? req.body.statut === "actif";
  ok(res, publicUser(await prisma.user.update({ where: { id: req.params.userId }, data: { actif: !!actif } })));
}));
router.delete("/users/:userId", auth(), roles(), ah(async (req, res) => {
  await guardTarget(req);
  if (req.params.userId === req.user.id) fail(400, "Vous ne pouvez pas supprimer votre propre compte");
  await prisma.user.delete({ where: { id: req.params.userId } });
  ok(res, { supprime: true });
}));

// ---------- Annuaire médecins ----------
async function avisStats(cibleType, ids) {
  const g = await prisma.avis.groupBy({ by: ["cibleId"], where: { cibleType, cibleId: { in: ids } }, _avg: { note: true }, _count: true });
  return new Map(g.map((x) => [x.cibleId, { noteMoyenne: +(x._avg.note ?? 0).toFixed(1), nbAvis: x._count }]));
}

router.get("/medecins", auth(), ah(async (_req, res) => {
  const m = await prisma.user.findMany({ where: { role: "medecin", actif: true }, orderBy: { nom: "asc" } });
  ok(res, m.map((u) => ({ ...publicUser(u), tel: u.telephone })));
}));
router.get("/medecins/:medecinId", auth(), ah(async (req, res) => {
  const u = await prisma.user.findFirst({ where: { id: req.params.medecinId, role: "medecin" } });
  if (!u) fail(404, "Médecin introuvable");
  const liaisons = await prisma.liaison.findMany({ where: { userId: u.id }, include: { enfant: true } });
  const ordonnancesRecentes = await prisma.ordonnance.findMany({ where: { medecinId: u.id }, include: { enfant: { select: { id: true, prenom: true, nom: true } } }, orderBy: { date: "desc" }, take: 20 });
  ok(res, { ...publicUser(u), enfantsSuivis: liaisons.map((l) => ({ id: l.enfant.id, prenom: l.enfant.prenom, nom: l.enfant.nom, pai: l.enfant.pai })), ordonnancesRecentes, historiqueLiaisons: liaisons });
}));
router.get("/medecins/:medecinId/stats", auth(), ah(async (req, res) => {
  const id = req.params.medecinId;
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [patients, ordonnancesMois, consultationsMois, ordos, rdvs] = await Promise.all([
    prisma.liaison.count({ where: { userId: id } }),
    prisma.ordonnance.count({ where: { medecinId: id, date: { gte: debutMois } } }),
    prisma.rendezVous.count({ where: { medecinId: id, date: { gte: debutMois } } }),
    prisma.ordonnance.findMany({ where: { medecinId: id, date: { gte: new Date(Date.now() - 365 * 864e5) } }, select: { date: true } }),
    prisma.rendezVous.findMany({ where: { medecinId: id, date: { gte: new Date(Date.now() - 365 * 864e5) } }, select: { date: true } }),
  ]);
  const M = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const parMois = M.map((mois, i) => ({ mois, ordonnances: ordos.filter((o) => o.date.getMonth() === i).length, consultations: rdvs.filter((o) => o.date.getMonth() === i).length }));
  ok(res, { patients, ordonnancesMois, consultationsMois, parMois });
}));
router.get("/rendez-vous/medecin/:medecinId", auth(), ah(async (req, res) => {
  const d = req.query.date ? new Date(String(req.query.date)) : new Date();
  const start = new Date(d.toDateString()), end = new Date(start.getTime() + 864e5);
  const r = await prisma.rendezVous.findMany({ where: { medecinId: req.params.medecinId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } });
  const enfants = await prisma.enfant.findMany({ where: { id: { in: r.map((x) => x.enfantId) } }, include: { etablissement: true } });
  ok(res, r.map((x) => { const e = enfants.find((y) => y.id === x.enfantId); return { ...x, heure: x.date.toTimeString().slice(0, 5), enfant: e && { prenom: e.prenom, nom: e.nom }, etablissement: e?.etablissement?.nom }; }));
}));
router.post("/rendez-vous", auth(), roles("medecin", "creche"), ah(async (req, res) => {
  required(req.body, ["enfantId", "date"]);
  ok(res, await prisma.rendezVous.create({ data: { medecinId: req.body.medecinId ?? req.user.id, enfantId: req.body.enfantId, date: new Date(req.body.date), motif: req.body.motif } }), 201);
}));

// ---------- Annuaire RSAI ----------
router.get("/rsai", auth(), ah(async (_req, res) => {
  const r = await prisma.user.findMany({ where: { role: "rsai", actif: true }, include: { affectations: { where: { statut: "active" }, include: { etablissement: { select: { id: true, nom: true } } } } } });
  const st = await avisStats("rsai", r.map((x) => x.id));
  ok(res, r.map((u) => ({ ...publicUser(u), tel: u.telephone, etablissements: u.affectations.map((a) => a.etablissement.nom), ...(st.get(u.id) ?? { noteMoyenne: 0, nbAvis: 0 }) })));
}));
router.get("/rsai/me/affectations", auth(), roles("rsai"), ah(async (req, res) => {
  const a = await prisma.affectation.findMany({ where: { rsaiId: req.user.id, statut: "active" }, include: { etablissement: true } });
  const counts = await prisma.enfant.groupBy({ by: ["etablissementId"], where: { etablissementId: { in: a.map((x) => x.etablissementId) } }, _count: true });
  ok(res, a.map((x) => ({
    ...x,
    etablissement: { id: x.etablissement.id, nom: x.etablissement.nom, adresse: x.etablissement.adresse, lat: x.etablissement.latitude, lng: x.etablissement.longitude, rayonM: x.etablissement.rayonMetres },
    horaires: x.jours.map((jour) => ({ jour, debut: x.debut, fin: x.fin })),
    enfants: counts.find((c) => c.etablissementId === x.etablissementId)?._count ?? 0,
  })));
}));
router.get("/rsai/:rsaiId", auth(), ah(async (req, res) => {
  const u = await prisma.user.findFirst({ where: { id: req.params.rsaiId, role: "rsai" }, include: { affectations: { include: { etablissement: true }, orderBy: { dateDebut: "desc" } } } });
  if (!u) fail(404, "RSAI introuvable");
  const avis = await prisma.avis.findMany({ where: { cibleType: "rsai", cibleId: u.id }, orderBy: { createdAt: "desc" } });
  const moy = avis.length ? +(avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : 0;
  ok(res, {
    ...publicUser(u), noteMoyenne: moy, nbAvis: avis.length,
    affectations: u.affectations.map((a) => ({ ...a, creche: { id: a.etablissement.id, nom: a.etablissement.nom } })),
    avis: avis.map((a) => ({ ...a, auteur: { nom: a.auteurNom } })),
  });
}));
router.post("/rsai/:rsaiId/avis", auth(), roles("creche"), ah(async (req, res) => {
  const note = Number(req.body.note);
  if (!(note >= 1 && note <= 5)) fail(400, "La note doit être comprise entre 1 et 5");
  const rsai = await prisma.user.findFirst({ where: { id: req.params.rsaiId, role: "rsai" } });
  if (!rsai) fail(404, "RSAI introuvable");
  const key = { auteurId_cibleType_cibleId: { auteurId: req.user.id, cibleType: "rsai", cibleId: rsai.id } };
  await prisma.avis.upsert({ where: key, update: { note, commentaire: req.body.commentaire },
    create: { auteurId: req.user.id, auteurNom: fullName(req.user), auteurRole: req.user.role, cibleType: "rsai", cibleId: rsai.id, cibleNom: fullName(rsai), note, commentaire: req.body.commentaire } });
  const st = (await avisStats("rsai", [rsai.id])).get(rsai.id);
  ok(res, st, 201);
}));

// ---------- Parents ----------
router.get("/parents/me/enfants", auth(), ah(async (req, res) => {
  const l = await prisma.liaison.findMany({ where: { userId: req.user.id }, include: { enfant: { include: { etablissement: { select: { id: true, nom: true } } } } } });
  const today = new Date(new Date().toDateString());
  const out = [];
  for (const { enfant } of l) {
    const t = await prisma.transmission.findMany({ where: { enfantId: enfant.id, createdAt: { gte: today } }, orderBy: { createdAt: "desc" } });
    const pres = await prisma.presence.findFirst({ where: { enfantId: enfant.id, date: { gte: today } } });
    out.push({ ...enfant, aujourdhui: { present: pres?.present ?? false, humeur: t.find((x) => x.humeur)?.humeur ?? null, repas: t.find((x) => x.type === "repas")?.contenu ?? null, sieste: t.find((x) => x.type === "sieste")?.contenu ?? null } });
  }
  ok(res, out);
}));
router.get("/parents/me/transmissions", auth(), ah(async (req, res) => {
  const ids = (await prisma.liaison.findMany({ where: { userId: req.user.id } })).map((l) => l.enfantId);
  const d = req.query.date ? new Date(String(req.query.date)) : new Date();
  const start = new Date(d.toDateString());
  ok(res, await prisma.transmission.findMany({ where: { enfantId: { in: ids }, createdAt: { gte: start, lt: new Date(start.getTime() + 864e5) } }, include: { enfant: { select: { id: true, prenom: true } } }, orderBy: { createdAt: "desc" } }));
}));
router.get("/parents/me/alertes", auth(), ah(async (req, res) => {
  const ids = (await prisma.liaison.findMany({ where: { userId: req.user.id } })).map((l) => l.enfantId);
  const d = await prisma.diagnostic.findMany({ where: { enfantId: { in: ids }, niveauRisque: { in: ["moyen", "eleve"] } }, include: { enfant: { select: { prenom: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  const a = await prisma.alerteSymptome.findMany({ where: { enfantId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 50 });
  const enf = await prisma.enfant.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true } });
  ok(res, [
    ...d.map((x) => ({ id: x.id, enfant: x.enfant, niveau: x.niveauRisque, message: x.diagnosticSuggere ?? "Analyse IA", createdAt: x.createdAt, lu: false })),
    ...a.map((x) => ({ id: x.id, enfant: enf.find((e) => e.id === x.enfantId), niveau: x.gravite === "elevee" ? "eleve" : x.gravite === "moyenne" ? "moyen" : "faible", message: x.symptome, createdAt: x.createdAt, lu: false })),
  ].sort((x, y) => +y.createdAt - +x.createdAt));
}));

module.exports = router;
module.exports.isAdmin = isAdmin;
