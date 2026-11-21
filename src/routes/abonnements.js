// Tarifs (forfaits par rôle), abonnements, Stripe.
import express from 'express';
import { prisma, ok, fail, ah, required, auth, roles, isAdmin, toDate } from '../lib/core.js';
import { assertEtab } from '../lib/access.js';
import Stripe from 'stripe';
import { cfg } from '../lib/runtime-config.js';

const router = express.Router();

const stripe = async () => {
  const key = await cfg('STRIPE_SECRET_KEY', '');
  if (!key) return null;
  return new Stripe(key);
};
const roleKey = (r) => (r === "superadmin" ? "admin" : r);

/**
 * Origine vers laquelle Stripe renvoie l'utilisateur.
 *
 * Priorité à l'en-tête `Origin` de la requête lorsqu'il est autorisé par CORS :
 * le retour se fait donc sur le domaine réellement utilisé (Vercel, domaine
 * personnalisé…), sans dépendre d'une URL d'hébergeur figée. Repli :
 * `FRONTEND_URL`, puis localhost.
 */
async function returnOrigin(req) {
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  const allowed = (await cfg("CORS_ORIGINS", "*")).split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && (allowed.includes("*") || allowed.includes(origin))) return origin;
  return (await cfg("FRONTEND_URL", "http://localhost:8080")).replace(/\/+$/, "");
}

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
  const s = await stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  // Le forfait peut être désigné par son identifiant (tarifId ou plan) ou par son nom.
  const identifiant = req.body?.tarifId ? String(req.body.tarifId) : null;
  const recherche = String(req.body?.plan ?? "").trim();
  let tarif = identifiant ? await prisma.tarif.findUnique({ where: { id: identifiant } }) : null;
  if (!tarif && recherche) {
    tarif = await prisma.tarif.findFirst({
      where: { OR: [{ id: recherche }, { nom: { equals: recherche, mode: "insensitive" } }] },
    });
  }
  if (!tarif) fail(404, "Forfait introuvable");
  const annuel = req.body.periodicite === "annuel";
  const unit = Math.round((annuel ? tarif.prixAnnuel ?? tarif.prixMensuel * 12 : tarif.prixMensuel) * 100);
  const frontend = await returnOrigin(req);

  // Checkout embarqué : le formulaire Stripe s'affiche dans notre propre page.
  // Repli automatique sur la page hébergée si la clé publique n'est pas configurée.
  const demandeEmbedded = req.body?.embedded === true || req.body?.mode === "embedded";
  const publishableKey = await cfg("STRIPE_PUBLISHABLE_KEY", "");
  const embedded = demandeEmbedded && !!publishableKey;
  const retour = `${frontend}/abonnement?paiement=ok&session_id={CHECKOUT_SESSION_ID}`;

  const base = {
    mode: "subscription",
    customer_email: req.user.email,
    line_items: [tarif.stripePriceId ? { price: tarif.stripePriceId, quantity: 1 } : { quantity: 1, price_data: { currency: "eur", unit_amount: unit, recurring: { interval: annuel ? "year" : "month" }, product_data: { name: `Kids'Med — ${tarif.nom}` } } }],
    metadata: { userId: req.user.id, etablissementId: req.user.etablissementId ?? "", tarifId: tarif.id, plan: tarif.nom },
  };
  const session = await s.checkout.sessions.create(embedded
    ? { ...base, ui_mode: "embedded", redirect_on_completion: "if_required", return_url: retour }
    : { ...base, success_url: retour, cancel_url: `${frontend}/abonnement?paiement=annule` });

  ok(res, {
    url: session.url ?? null,
    clientSecret: embedded ? session.client_secret : null,
    publishableKey: embedded ? publishableKey : null,
    embedded,
    sessionId: session.id,
    ...(demandeEmbedded && !embedded ? { avertissement: "STRIPE_PUBLISHABLE_KEY absente : repli sur la page Stripe hébergée." } : {}),
  });
}));
router.post("/abonnements/portail", auth(), ah(async (req, res) => {
  const s = await stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  const a = await prisma.abonnement.findFirst({ where: { userId: req.user.id, stripeCustomerId: { not: null } } });
  if (!a) fail(404, "Aucun abonnement Stripe pour ce compte");
  const frontend = await returnOrigin(req);
  const p = await s.billingPortal.sessions.create({ customer: a.stripeCustomerId, return_url: `${frontend}/abonnement` });
  ok(res, { url: p.url });
}));

/** Webhook Stripe (monté avant express.json dans server.js). */
async function stripeWebhook(req, res) {
  const s = await stripe();
  const webhookSecret = await cfg("STRIPE_WEBHOOK_SECRET", "");
  if (!s || !webhookSecret) return res.status(503).send("Stripe non configuré");
  let ev;
  try { ev = s.webhooks.constructEvent(req.body, req.headers["stripe-signature"], webhookSecret); }
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

export default router;
export { stripeWebhook };
