// Flux terrain : absences, températures, émargement médicaments, autorisations, sorties, registres, mémos.
import express from 'express';
import { prisma, ok, fail, ah, required, auth, roles, toDate, notify, fullName } from '../lib/core.js';
import { assertEnfant, assertEtab, rsaiEtabIds, distanceM } from '../lib/access.js';

const router = express.Router();

const jour = (d = new Date()) => d.toISOString().slice(0, 10);
async function staffIds(etablissementId) {
  if (!etablissementId) return [];
  return (await prisma.user.findMany({ where: { role: "creche", etablissementId }, select: { id: true } })).map((u) => u.id);
}

// Absence signalée par un parent (ou pointage crèche)
router.post("/presences/absence", auth(), roles("parent", "creche"), ah(async (req, res) => {
  required(req.body, ["enfantId"]);
  const e = await assertEnfant(req.user, req.body.enfantId);
  const p = await prisma.presence.create({ data: { enfantId: e.id, date: toDate(req.body.date) ?? new Date(), dateFin: toDate(req.body.dateFin), present: false, motif: req.body.motif ?? null, auteurId: req.user.id } });
  if (req.user.role === "parent") await notify(await staffIds(e.etablissementId), "Absence signalée", `${e.prenom} ${e.nom} — ${req.body.motif ?? "sans motif"} (${fullName(req.user)})`, `/enfants/${e.id}`, "info");
  ok(res, p, 201);
}));
router.get("/presences/today/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const d0 = new Date(jour()); const d1 = new Date(d0.getTime() + 864e5);
  const ids = (await prisma.enfant.findMany({ where: { etablissementId: req.params.etablissementId }, select: { id: true } })).map((x) => x.id);
  ok(res, await prisma.presence.findMany({ where: { enfantId: { in: ids }, OR: [{ date: { gte: d0, lt: d1 } }, { date: { lt: d1 }, dateFin: { gte: d0 } }] }, orderBy: { createdAt: "desc" } }));
}));

// Températures (parents autorisés)
router.get("/enfants/:enfantId/temperatures", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.temperature.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "asc" }, take: 200 }));
}));
router.post("/enfants/:enfantId/temperatures", auth(), roles("parent", "creche", "rsai", "medecin"), ah(async (req, res) => {
  const v = Number(req.body.temperature ?? req.body.valeur);
  if (!(v >= 34 && v <= 43)) fail(400, "Température invalide (34–43 °C)");
  const e = await assertEnfant(req.user, req.params.enfantId);
  const t = await prisma.temperature.create({ data: { enfantId: e.id, valeur: v, methode: req.body.methode ?? null, auteurId: req.user.id, auteurRole: req.user.role } });
  if (v >= 38.5) {
    const parents = (await prisma.liaison.findMany({ where: { enfantId: e.id }, select: { userId: true } })).map((l) => l.userId);
    await notify([...parents, ...(await staffIds(e.etablissementId))].filter((id) => id !== req.user.id), "Fièvre", `${e.prenom} : ${v.toFixed(1)} °C`, `/enfants/${e.id}`, "alerte");
  }
  ok(res, t, 201);
}));

// Émargement médicament
router.get("/medicaments/:id/administrations", auth(), ah(async (req, res) => {
  const m = await prisma.medicament.findUnique({ where: { id: req.params.id } });
  if (!m) fail(404, "Médicament introuvable");
  await assertEnfant(req.user, m.enfantId);
  ok(res, await prisma.administration.findMany({ where: { medicamentId: m.id, jour: req.query.jour || jour() } }));
}));
router.post("/medicaments/:id/administrer", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  required(req.body, ["heure"]);
  const m = await prisma.medicament.findUnique({ where: { id: req.params.id } });
  if (!m) fail(404, "Médicament introuvable");
  await assertEnfant(req.user, m.enfantId);
  const j = jour();
  const exist = await prisma.administration.findUnique({ where: { medicamentId_heure_jour: { medicamentId: m.id, heure: req.body.heure, jour: j } } });
  if (exist) fail(409, "Prise déjà enregistrée");
  ok(res, await prisma.administration.create({ data: { medicamentId: m.id, enfantId: m.enfantId, heure: req.body.heure, dose: req.body.dose ?? m.posologie, auteurId: req.user.id, jour: j } }), 201);
}));

// Autorisations (signature parent)
router.get("/enfants/:enfantId/autorisations", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.autorisation.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" } }));
}));
router.post("/enfants/:enfantId/autorisations", auth(), roles("creche", "medecin"), ah(async (req, res) => {
  required(req.body, ["titre"]);
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.autorisation.create({ data: { enfantId: req.params.enfantId, titre: req.body.titre } }), 201);
}));
router.post("/enfants/:enfantId/autorisations/:id/signer", auth(), roles("parent"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  const a = await prisma.autorisation.findUnique({ where: { id: req.params.id } });
  if (!a || a.enfantId !== req.params.enfantId) fail(404, "Autorisation introuvable");
  ok(res, await prisma.autorisation.update({ where: { id: a.id }, data: { signe: true, signeParId: req.user.id, signeAt: new Date() } }));
}));

// Personnes autorisées à récupérer l'enfant
router.get("/enfants/:enfantId/sorties", auth(), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.personneAutorisee.findMany({ where: { enfantId: req.params.enfantId } }));
}));
router.post("/enfants/:enfantId/sorties", auth(), roles("parent", "creche"), ah(async (req, res) => {
  required(req.body, ["nom"]);
  await assertEnfant(req.user, req.params.enfantId);
  ok(res, await prisma.personneAutorisee.create({ data: { enfantId: req.params.enfantId, nom: req.body.nom, lien: req.body.lien, telephone: req.body.telephone } }), 201);
}));
router.delete("/enfants/:enfantId/sorties/:id", auth(), roles("parent", "creche"), ah(async (req, res) => {
  await assertEnfant(req.user, req.params.enfantId);
  await prisma.personneAutorisee.deleteMany({ where: { id: req.params.id, enfantId: req.params.enfantId } });
  ok(res, { deleted: true });
}));

// Registres RSAI
router.get("/registres/:registre/entrees", auth(), roles("rsai", "creche"), ah(async (req, res) => {
  ok(res, await prisma.registreEntree.findMany({ where: { registre: req.params.registre, ...(req.user.role === "creche" ? { etablissementId: req.user.etablissementId } : { auteurId: req.user.id }) }, orderBy: { createdAt: "desc" }, take: 200 }));
}));
router.post("/registres/:registre/entrees", auth(), roles("rsai", "creche"), ah(async (req, res) => {
  required(req.body, ["texte"]);
  const etablissementId = req.body.etablissementId || req.user.etablissementId || null;
  if (etablissementId) await assertEtab(req.user, etablissementId);
  ok(res, await prisma.registreEntree.create({ data: { registre: req.params.registre, etablissementId, texte: String(req.body.texte).slice(0, 4000), auteurId: req.user.id } }), 201);
}));

// Mémos : marquer comme traité
router.patch("/transmissions/:id/traiter", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  const t = await prisma.transmission.findUnique({ where: { id: req.params.id } });
  if (!t) fail(404, "Mémo introuvable");
  await assertEnfant(req.user, t.enfantId);
  ok(res, await prisma.transmission.update({ where: { id: t.id }, data: { traite: req.body.traite !== false, traiteAt: new Date() } }));
}));

// Géorepérage RSAI : la position est-elle dans le périmètre d'une crèche affectée ?
router.post("/securite/verifier-position", auth(), roles("rsai", "creche"), ah(async (req, res) => {
  const lat = Number(req.body.latitude ?? req.body.lat), lng = Number(req.body.longitude ?? req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) fail(400, "Position invalide");
  const ids = req.user.role === "rsai" ? await rsaiEtabIds(req.user.id) : [req.user.etablissementId].filter(Boolean);
  const etabs = await prisma.etablissement.findMany({ where: { id: { in: ids } } });
  let best = null;
  for (const e of etabs) {
    if (e.latitude == null || e.longitude == null) continue;
    const d = Math.round(distanceM(lat, lng, e.latitude, e.longitude));
    if (!best || d < best.distanceM) best = { etablissementId: e.id, nom: e.nom, distanceM: d, rayon: e.rayonMetres };
  }
  const autorise = !!best && best.distanceM <= best.rayon;
  if (!autorise) fail(403, best ? `Hors périmètre (${best.distanceM} m de ${best.nom})` : "Aucune crèche géolocalisée affectée");
  ok(res, { autorise, ...best });
}));

export default router;
