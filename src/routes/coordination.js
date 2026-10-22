import express from 'express';
import { prisma, ok, fail, ah, required, auth, roles, isAdmin, notify, adminIds, toDate } from '../lib/core.js';

const router = express.Router();

const inc = { rsai: { select: { id: true, prenom: true, nom: true, email: true } }, etablissement: { select: { id: true, nom: true, adresse: true } } };
const shape = (a) => ({ ...a, creche: a.etablissement, crecheId: a.etablissementId, rsai: a.rsai && { ...a.rsai, nom: [a.rsai.prenom, a.rsai.nom].filter(Boolean).join(" ") } });

// Affectations : filtres année / mois / statut / pagination
router.get("/affectations", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  const q = req.query;
  const where = {};
  if (req.user.role === "creche") where.etablissementId = req.user.etablissementId ?? "-";
  if (req.user.role === "rsai") where.rsaiId = req.user.id;
  if (q.rsaiId) where.rsaiId = String(q.rsaiId);
  if (q.crecheId || q.etablissementId) where.etablissementId = String(q.crecheId ?? q.etablissementId);
  if (q.statut) where.statut = String(q.statut);
  if (q.q) where.AND = [{ OR: [{ rsai: { nom: { contains: String(q.q), mode: "insensitive" } } }, { rsai: { prenom: { contains: String(q.q), mode: "insensitive" } } }, { etablissement: { nom: { contains: String(q.q), mode: "insensitive" } } }] }];
  if (q.annee) {
    const y = Number(q.annee), m = q.mois ? Number(q.mois) - 1 : null;
    const start = new Date(y, m ?? 0, 1), end = m != null ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1);
    where.dateDebut = { lt: end };
    where.OR = [{ dateFin: null }, { dateFin: { gte: start } }];
  }
  const page = Math.max(1, Number(q.page ?? 1)), limit = Math.min(500, Number(q.limit ?? 200));
  const [total, rows, rsaiActives, crechesCouvertes, demandesEnAttente] = await Promise.all([
    prisma.affectation.count({ where }),
    prisma.affectation.findMany({ where, include: inc, orderBy: { dateDebut: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.affectation.findMany({ where: { ...where, statut: "active" }, distinct: ["rsaiId"], select: { rsaiId: true } }),
    prisma.affectation.findMany({ where: { ...where, statut: "active" }, distinct: ["etablissementId"], select: { etablissementId: true } }),
    prisma.demandeRsai.count({ where: { statut: "en_attente", ...(req.user.role === "creche" ? { etablissementId: req.user.etablissementId } : {}) } }),
  ]);
  res.json({ success: true, data: rows.map(shape).map((x) => ({ ...x, _id: x.id })), total, page, annee: q.annee ? Number(q.annee) : null, stats: { rsaiActives: rsaiActives.length, crechesCouvertes: crechesCouvertes.length, demandesEnAttente } });
}));

router.post("/affectations", auth(), roles(), ah(async (req, res) => {
  const b = req.body;
  const etablissementId = b.etablissementId ?? b.crecheId;
  required({ ...b, etablissementId }, ["rsaiId", "etablissementId", "dateDebut"]);
  const rsai = await prisma.user.findFirst({ where: { id: b.rsaiId, role: "rsai" } });
  if (!rsai) fail(404, "RSAI introuvable");
  const jours = Array.isArray(b.jours) ? b.jours.map(Number) : [1, 2, 3, 4, 5];
  const a = await prisma.affectation.create({ data: { rsaiId: b.rsaiId, etablissementId, jours, debut: b.debut ?? "08:00", fin: b.fin ?? "18:00", dateDebut: new Date(b.dateDebut), dateFin: toDate(b.dateFin) }, include: inc });
  if (b.demandeId) await prisma.demandeRsai.update({ where: { id: b.demandeId }, data: { statut: "acceptee", affectationId: a.id } }).catch(() => {});
  const staff = await prisma.user.findMany({ where: { etablissementId, role: "creche" }, select: { id: true } });
  await notify([rsai.id, ...staff.map((s) => s.id)], "Nouvelle affectation RSAI", `${rsai.prenom} ${rsai.nom} → ${a.etablissement.nom}`, "/affectations");
  ok(res, shape(a), 201);
}));

router.delete("/affectations/:affectationId", auth(), roles(), ah(async (req, res) => {
  const a = await prisma.affectation.update({ where: { id: req.params.affectationId }, data: { statut: "revoquee", dateFin: new Date() } });
  await notify([a.rsaiId], "Affectation révoquée", "Une de vos affectations a été révoquée.", "/affectations");
  ok(res, { statut: a.statut });
}));

// Demandes de RSAI
router.get("/demandes-rsai", auth(), roles("creche"), ah(async (req, res) => {
  const where = isAdmin(req.user) ? {} : { etablissementId: req.user.etablissementId ?? "-" };
  ok(res, await prisma.demandeRsai.findMany({ where, include: { etablissement: { select: { id: true, nom: true } } }, orderBy: { createdAt: "desc" } }));
}));
router.post("/demandes-rsai", auth(), roles("creche"), ah(async (req, res) => {
  const etablissementId = req.user.role === "creche" ? req.user.etablissementId : req.body.etablissementId;
  if (!etablissementId) fail(400, "Votre compte n'est rattaché à aucun établissement");
  required(req.body, ["motif"]);
  const d = await prisma.demandeRsai.create({ data: { etablissementId, rsaiId: req.body.rsaiId || null, motif: req.body.motif, dateSouhaitee: toDate(req.body.dateSouhaitee) } });
  await notify(await adminIds(), "Demande de RSAI", req.body.motif, "/coordination");
  ok(res, d, 201);
}));
router.patch("/demandes-rsai/:demandeId", auth(), roles(), ah(async (req, res) => {
  required(req.body, ["statut"]);
  const d = await prisma.demandeRsai.update({ where: { id: req.params.demandeId }, data: { statut: req.body.statut, reponse: req.body.motif, affectationId: req.body.affectationId } });
  const staff = await prisma.user.findMany({ where: { etablissementId: d.etablissementId, role: "creche" }, select: { id: true } });
  await notify(staff.map((s) => s.id), `Demande de RSAI ${d.statut}`, req.body.motif ?? "", "/coordination");
  ok(res, d);
}));

// Avis réciproques
router.get("/avis", auth(), roles("creche", "rsai"), ah(async (req, res) => {
  let where = {};
  if (req.user.role === "rsai") where = { OR: [{ cibleId: req.user.id }, { auteurId: req.user.id }] };
  if (req.user.role === "creche") where = { OR: [{ cibleId: req.user.etablissementId ?? "-" }, { auteurId: req.user.id }, { cibleType: "rsai" }] };
  ok(res, await prisma.avis.findMany({ where, orderBy: { createdAt: "desc" } }));
}));

export default router;
