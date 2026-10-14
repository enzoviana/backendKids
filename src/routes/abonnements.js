// Tarifs (forfaits par rôle), abonnements, Stripe.
const router = require("express").Router();
const { prisma, ok, fail, ah, required, auth, roles, isAdmin, toDate } = require("../lib/core");
const { assertEtab } = require("../lib/access");

const stripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
};
const roleKey = (r) => (r === "superadmin" ? "admin" : r);

// ---------- Tarifs ----------
router.get("/tarifs", auth(), ah(async (req, res) => {
  const where = {};
  const cible = req.query.roleCible ? String(req.query.roleCible) : isAdmin(req.user) ? null : roleKey(req.user.role);
  if (cible) where.roleCible = { in: [cible, "tous"] };
  if (!isAdmin(req.user)) where.actif = true;
  ok(res, await prisma.tarif.findMany({ where, orderBy: { prixMensuel: "asc" } }));
}));
router.get("/tarifs/actifs", auth(), ah(async (_req, res) => ok(res, await prisma.tarif.findMany({ where: { actif: true }, orderBy: { prixMensuel: "asc" } }))));
const tarifData = (b) => ({ nom: b.nom, roleCible: b.roleCible, prixMensuel: b.prixMensuel != null ? Number(b.prixMensuel) : undefined, prixAnnuel: b.prixAnnuel != null && b.prixAnnuel !== "" ? Number(b.prixAnnuel) : undefined, actif: b.actif != null ? b.actif === true || b.actif === "true" : undefined, stripePriceId: b.stripePriceId,
  fonctionnalites: Array.isArray(b.fonctionnalites) ? b.fonctionnalites : typeof b.fonctionnalites === "string" ? b.fonctionnalites.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : undefined });
router.post("/tarifs", auth(), roles(), ah(async (req, res) => {
  required(req.body, ["nom", "prixMensuel"]);
  ok(res, await prisma.tarif.create({ data: { roleCible: "tous", ...JSON.parse(JSON.stringify(tarifData(req.body))) } }), 201);
}));
router.put("/tarifs/:id", auth(), roles(), ah(async (req, res) => ok(res, await prisma.tarif.update({ where: { id: req.params.id }, data: tarifData(req.body) }))));
router.delete("/tarifs/:id", auth(), roles(), ah(async (req, res) => { await prisma.tarif.delete({ where: { id: req.params.id } }); ok(res, { supprime: true }); }));

// ---------- Abonnements ----------
const inc = { etablissement: { select: { id: true, nom: true } } };
router.get("/abonnements", auth(), roles(), ah(async (_req, res) => ok(res, await prisma.abonnement.findMany({ include: inc, orderBy: { createdAt: "desc" } }))));
router.get("/abonnements/stats", auth(), roles(), ah(async (_req, res) => {
  const a = await prisma.abonnement.findMany();
  const actifs = a.filter((x) => x.statut === "actif");
  const parPlan = {};
  actifs.forEach((x) => (parPlan[x.plan] = (parPlan[x.plan] ?? 0) + 1));
  ok(res, { total: a.length, actifs: actifs.length, essai: a.filter((x) => x.statut === "essai").length, mrr: actifs.reduce((s, x) => s + (x.gratuit ? 0 : x.prixMensuel), 0), parPlan });
}));
router.get("/abonnements/revenus", auth(), roles(), ah(async (req, res) => {
  const y = Number(req.query.annee ?? new Date().getFullYear());
  const a = await prisma.abonnement.findMany({ where: { gratuit: false } });
  const M = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  ok(res, M.map((mois, i) => {
    const d = new Date(y, i, 15), row = { mois };
    a.filter((x) => x.dateDebut <= d && (!x.dateFin || x.dateFin >= d)).forEach((x) => (row[x.plan] = (row[x.plan] ?? 0) + x.prixMensuel));
    return row;
  }));
}));
router.get("/abonnements/me", auth(), ah(async (req, res) => {
  const a = await prisma.abonnement.findFirst({ where: { OR: [{ userId: req.user.id }, ...(req.user.etablissementId ? [{ etablissementId: req.user.etablissementId }] : [])] }, orderBy: { createdAt: "desc" } });
  ok(res, a ?? null);
}));
router.get("/abonnements/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  ok(res, await prisma.abonnement.findFirst({ where: { etablissementId: req.params.etablissementId }, orderBy: { createdAt: "desc" } }));
}));
const aboData = (b) => ({ etablissementId: b.etablissementId || undefined, userId: b.userId || undefined, plan: b.plan, statut: b.statut, prixMensuel: b.prixMensuel != null && b.prixMensuel !== "" ? Number(b.prixMensuel) : undefined, dateDebut: toDate(b.dateDebut), dateFin: toDate(b.dateFin), gratuit: b.gratuit != null ? !!b.gratuit : undefined });
router.post("/abonnements", auth(), roles(), ah(async (req, res) => {
  required(req.body, ["plan"]);
  ok(res, await prisma.abonnement.create({ data: JSON.parse(JSON.stringify(aboData(req.body))), include: inc }), 201);
}));
router.put("/abonnements/:id", auth(), roles(), ah(async (req, res) => ok(res, await prisma.abonnement.update({ where: { id: req.params.id }, data: aboData(req.body), include: inc }))));
router.put("/abonnements/:abonnementId/attribuer", auth(), roles(), ah(async (req, res) => ok(res, await prisma.abonnement.update({ where: { id: req.params.abonnementId }, data: { plan: req.body.plan, dateFin: toDate(req.body.dateFin), gratuit: !!req.body.gratuit, statut: "actif" } }))));
router.delete("/abonnements/:id", auth(), roles(), ah(async (req, res) => { await prisma.abonnement.delete({ where: { id: req.params.id } }); ok(res, { supprime: true }); }));

// ---------- Stripe ----------
router.post("/abonnements/checkout-session", auth(), ah(async (req, res) => {
  const s = stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  const tarif = req.body.tarifId ? await prisma.tarif.findUnique({ where: { id: req.body.tarifId } }) : await prisma.tarif.findFirst({ where: { nom: { equals: String(req.body.plan ?? ""), mode: "insensitive" } } });
  if (!tarif) fail(404, "Forfait introuvable");
  const annuel = req.body.periodicite === "annuel";
  const unit = Math.round((annuel ? tarif.prixAnnuel ?? tarif.prixMensuel * 12 : tarif.prixMensuel) * 100);
  const session = await s.checkout.sessions.create({
    mode: "subscription", customer_email: req.user.email,
    line_items: [tarif.stripePriceId ? { price: tarif.stripePriceId, quantity: 1 } : { quantity: 1, price_data: { currency: "eur", unit_amount: unit, recurring: { interval: annuel ? "year" : "month" }, product_data: { name: `Kids'Med — ${tarif.nom}` } } }],
    metadata: { userId: req.user.id, etablissementId: req.user.etablissementId ?? "", tarifId: tarif.id, plan: tarif.nom },
    success_url: `${process.env.FRONTEND_URL}/abonnement?paiement=ok`, cancel_url: `${process.env.FRONTEND_URL}/abonnement?paiement=annule`,
  });
  ok(res, { url: session.url, sessionId: session.id });
}));
router.post("/abonnements/portail", auth(), ah(async (req, res) => {
  const s = stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  const a = await prisma.abonnement.findFirst({ where: { userId: req.user.id, stripeCustomerId: { not: null } } });
  if (!a) fail(404, "Aucun abonnement Stripe pour ce compte");
  const p = await s.billingPortal.sessions.create({ customer: a.stripeCustomerId, return_url: `${process.env.FRONTEND_URL}/abonnement` });
  ok(res, { url: p.url });
}));

/** Webhook Stripe (monté avant express.json dans server.js). */
async function stripeWebhook(req, res) {
  const s = stripe();
  if (!s || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send("Stripe non configuré");
  let ev;
  try { ev = s.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send(`Signature invalide : ${e.message}`); }
  if (ev.type === "checkout.session.completed") {
    const o = ev.data.object, m = o.metadata ?? {};
    const tarif = m.tarifId ? await prisma.tarif.findUnique({ where: { id: m.tarifId } }) : null;
    await prisma.abonnement.create({ data: { userId: m.userId || null, etablissementId: m.etablissementId || null, plan: m.plan ?? "inconnu", statut: "actif", prixMensuel: tarif?.prixMensuel ?? 0, stripeCustomerId: o.customer, stripeSubscriptionId: o.subscription } });
  }
  if (ev.type === "customer.subscription.deleted" || ev.type === "invoice.payment_failed") {
    const sub = ev.data.object.subscription ?? ev.data.object.id;
    await prisma.abonnement.updateMany({ where: { stripeSubscriptionId: sub }, data: { statut: ev.type === "invoice.payment_failed" ? "suspendu" : "resilie" } });
  }
  res.json({ received: true });
}

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
