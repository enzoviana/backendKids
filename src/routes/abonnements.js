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

/** Retrouve un forfait par identifiant (`tarifId`, `plan`) ou par nom. */
async function resoudreTarif(body) {
  const identifiant = body?.tarifId ? String(body.tarifId) : null;
  const recherche = String(body?.plan ?? "").trim();
  let tarif = identifiant ? await prisma.tarif.findUnique({ where: { id: identifiant } }) : null;
  if (!tarif && recherche) {
    tarif = await prisma.tarif.findFirst({
      where: { OR: [{ id: recherche }, { nom: { equals: recherche, mode: "insensitive" } }] },
    });
  }
  return tarif;
}

/** Prix Stripe réutilisable pour un forfait (créé à la volée si absent). */
async function prixStripe(s, tarif, annuel) {
  if (!annuel && tarif.stripePriceId) return tarif.stripePriceId;
  const montant = Number(annuel ? tarif.prixAnnuel ?? tarif.prixMensuel * 12 : tarif.prixMensuel);
  if (!(montant > 0)) return null;
  const price = await s.prices.create({
    currency: "eur",
    unit_amount: Math.round(montant * 100),
    recurring: { interval: annuel ? "year" : "month" },
    product_data: { name: `Kids'Med — ${tarif.nom}` },
    metadata: { tarifId: tarif.id, periodicite: annuel ? "annuel" : "mensuel" },
  });
  if (!annuel) await prisma.tarif.update({ where: { id: tarif.id }, data: { stripePriceId: price.id } });
  return price.id;
}

/** Fin de la période courante Stripe, selon la version d'API. */
const finPeriode = (sub) => {
  const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : undefined;
};

/** Statut applicatif correspondant à un statut d'abonnement Stripe. */
const statutStripe = (statut) => ["active"].includes(statut) ? "actif"
  : ["trialing"].includes(statut) ? "essai"
  : ["past_due", "unpaid"].includes(statut) ? "suspendu"
  : ["canceled", "incomplete_expired"].includes(statut) ? "resilie"
  : "en_attente";

/** Portée de l'abonnement : établissement pour une crèche, sinon le compte. */
const porteeAbonnement = (user) => user.etablissementId
  ? { etablissementId: user.etablissementId }
  : { userId: user.id };

/**
 * Corrige un statut local incohérent avec Stripe (ex. abonnement « actif » alors
 * que le paiement n'a jamais abouti). Limité à une vérification par minute.
 */
const synchroRecente = new Map();
async function synchroniserAbonnement(a) {
  if (!a?.stripeSubscriptionId || a.gratuit) return a;
  if (!["actif", "en_attente"].includes(a.statut)) return a;
  const dernier = synchroRecente.get(a.id) ?? 0;
  if (Date.now() - dernier < 60_000) return a;
  const s = await stripe();
  if (!s) return a;
  synchroRecente.set(a.id, Date.now());
  try {
    const sub = await s.subscriptions.retrieve(a.stripeSubscriptionId);
    const statut = statutStripe(sub.status);
    if (statut !== a.statut) {
      return await prisma.abonnement.update({
        where: { id: a.id },
        data: { statut, dateFin: finPeriode(sub) ?? a.dateFin },
      });
    }
  } catch {
    // Stripe indisponible : on conserve l'état local.
  }
  return a;
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
const tarifData = (b) => ({ nom: b.nom, roleCible: b.roleCible, prixMensuel: b.prixMensuel != null ? Number(b.prixMensuel) : undefined, prixAnnuel: b.prixAnnuel != null && b.prixAnnuel !== "" ? Number(b.prixAnnuel) : undefined, joursEssai: b.joursEssai !== undefined && b.joursEssai !== null ? Math.min(730, Math.max(0, Math.trunc(Number(b.joursEssai) || 0))) : undefined, actif: b.actif != null ? b.actif === true || b.actif === "true" : undefined, stripePriceId: b.stripePriceId,
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
  ok(res, a ? await synchroniserAbonnement(a) : null);
}));
router.get("/abonnements/etablissement/:etablissementId", auth(), ah(async (req, res) => {
  await assertEtab(req.user, req.params.etablissementId);
  const a = await prisma.abonnement.findFirst({ where: { etablissementId: req.params.etablissementId }, orderBy: { createdAt: "desc" } });
  ok(res, a ? await synchroniserAbonnement(a) : null);
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
/** Crée (ou met à niveau) l'abonnement et renvoie le clientSecret du Payment Element. */
router.post("/abonnements/paiement/intent", auth(), ah(async (req, res) => {
  const tarif = await resoudreTarif(req.body);
  if (!tarif) {
    const disponibles = await prisma.tarif.findMany({ where: { actif: true }, select: { nom: true }, take: 20 });
    fail(404, `Forfait introuvable${String(req.body?.plan ?? "").trim() ? ` : « ${String(req.body.plan).trim()} »` : ""}`, { forfaitsDisponibles: disponibles.map((t) => t.nom) });
  }

  const annuel = req.body?.periodicite === "annuel";
  const portee = porteeAbonnement(req.user);
  let abonnement = await prisma.abonnement.findFirst({ where: portee, orderBy: { createdAt: "desc" } });

  // Forfait gratuit : activation immédiate, aucun passage par Stripe.
  if (!(Number(tarif.prixMensuel) > 0)) {
    const data = {
      plan: tarif.nom, statut: "actif", prixMensuel: 0, gratuit: true,
      dateDebut: new Date(), dateFin: null, stripeSubscriptionId: null, stripeCustomerId: null,
    };
    abonnement = abonnement
      ? await prisma.abonnement.update({ where: { id: abonnement.id }, data })
      : await prisma.abonnement.create({ data: { ...portee, ...data } });
    return ok(res, { gratuit: true, statut: "actif", abonnementId: abonnement.id, plan: tarif.nom, montant: 0, clientSecret: null, publishableKey: null });
  }

  const s = await stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  const publishableKey = await cfg("STRIPE_PUBLISHABLE_KEY", "");
  if (!publishableKey) fail(503, "Paiement indisponible : STRIPE_PUBLISHABLE_KEY n'est pas configurée sur le serveur");

  // Client Stripe réutilisé s'il existe déjà.
  let customerId = abonnement?.stripeCustomerId ?? null;
  if (!customerId) {
    const client = await s.customers.create({
      email: req.user.email,
      name: [req.user.prenom, req.user.nom].filter(Boolean).join(" ") || undefined,
      metadata: { userId: req.user.id, etablissementId: req.user.etablissementId ?? "" },
    });
    customerId = client.id;
  }

  const joursEssai = Math.min(730, Math.max(0, Math.trunc(Number(tarif.joursEssai) || 0)));
  const meta = {
    userId: req.user.id,
    etablissementId: req.user.etablissementId ?? "",
    tarifId: tarif.id,
    plan: tarif.nom,
    periodicite: annuel ? "annuel" : "mensuel",
    joursEssai: String(joursEssai),
  };

  // Abonnement existant : distingue un changement de formule d'un premier essai.
  let actuel = null;
  if (abonnement?.stripeSubscriptionId) {
    try { actuel = await s.subscriptions.retrieve(abonnement.stripeSubscriptionId); } catch { /* recréation */ }
  }
  const existantUtilisable = !!actuel && ["active", "trialing", "past_due", "incomplete"].includes(actuel.status);

  // Essai gratuit : on collecte d'abord une carte (SetupIntent). L'abonnement est
  // créé après confirmation, pour ne jamais démarrer un essai sans moyen de paiement.
  if (joursEssai > 0 && !existantUtilisable) {
    const setup = await s.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: meta,
    });
    const data = {
      plan: tarif.nom,
      statut: "en_attente",
      prixMensuel: Number(tarif.prixMensuel),
      gratuit: false,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      dateDebut: new Date(),
      dateFin: null,
    };
    abonnement = abonnement
      ? await prisma.abonnement.update({ where: { id: abonnement.id }, data })
      : await prisma.abonnement.create({ data: { ...portee, ...data } });
    return ok(res, {
      abonnementId: abonnement.id,
      clientSecret: setup.client_secret,
      publishableKey,
      montant: 0,
      devise: "eur",
      plan: tarif.nom,
      prixMensuel: Number(tarif.prixMensuel),
      joursEssai,
      mode: "setup",
      setupIntentId: setup.id,
      statut: "en_attente",
    });
  }

  const priceId = await prixStripe(s, tarif, annuel);
  if (!priceId) fail(400, "Ce forfait n'a pas de prix Stripe valide");

  let sub = null;
  let miseANiveau = false;

  // Changement de formule : modification de l'abonnement existant (avec prorata).
  if (existantUtilisable) {
    miseANiveau = ["active", "trialing"].includes(actuel.status);
    const item = actuel.items?.data?.[0];
    sub = await s.subscriptions.update(actuel.id, {
      items: item ? [{ id: item.id, price: priceId }] : [{ price: priceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: meta,
    });
  }

  if (!sub) {
    sub = await s.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: meta,
      ...(joursEssai > 0 ? { trial_period_days: joursEssai } : {}),
    });
  }

  // Facture et moyen de paiement, avec compatibilité entre versions d'API Stripe
  // (`payment_intent` historique, `confirmation_secret` récent).
  const factureBrute = sub.latest_invoice;
  let facture = factureBrute && typeof factureBrute === "object" ? factureBrute : null;
  if (!facture && typeof factureBrute === "string") {
    facture = await s.invoices.retrieve(factureBrute, { expand: ["payment_intent"] });
  }
  const intention = facture?.payment_intent && typeof facture.payment_intent === "object" ? facture.payment_intent : null;
  const montant = intention?.amount ?? facture?.amount_due ?? 0;
  const clientSecret = intention?.client_secret ?? facture?.confirmation_secret?.client_secret ?? null;
  const paiementRequis = Number(montant) > 0;
  const statut = paiementRequis ? "en_attente" : "actif";

  if (miseANiveau) {
    // Ne jamais changer la formule en base avant que le prorata soit réglé.
    abonnement = await prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { stripeCustomerId: customerId, stripeSubscriptionId: sub.id },
    });
  } else {
    const data = {
      plan: tarif.nom,
      statut,
      prixMensuel: Number(tarif.prixMensuel),
      gratuit: false,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      dateDebut: new Date(),
      dateFin: finPeriode(sub) ?? null,
    };
    abonnement = abonnement
      ? await prisma.abonnement.update({ where: { id: abonnement.id }, data })
      : await prisma.abonnement.create({ data: { ...portee, ...data } });
  }

  if (paiementRequis && !clientSecret) {
    fail(502, "Stripe n'a pas renvoyé de moyen de paiement. Réessayez dans un instant.");
  }

  ok(res, {
    abonnementId: abonnement.id,
    clientSecret,
    publishableKey: clientSecret ? publishableKey : null,
    montant,
    devise: "eur",
    plan: tarif.nom,
    statut,
  });
}));

/** Confirme côté serveur l'état de l'abonnement après un paiement (sans attendre le webhook). */
router.post("/abonnements/paiement/finaliser", auth(), ah(async (req, res) => {
  required(req.body, ["abonnementId"]);
  const abo = await prisma.abonnement.findUnique({ where: { id: String(req.body.abonnementId) } });
  if (!abo) fail(404, "Abonnement introuvable");
  const possede = abo.userId === req.user.id || (!!abo.etablissementId && abo.etablissementId === req.user.etablissementId);
  if (!possede) fail(403, "Abonnement non accessible");

  const s = await stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");

  // Essai gratuit : la carte a été confirmée via SetupIntent, on crée maintenant
  // l'abonnement en essai avec ce moyen de paiement comme défaut.
  const setupIntentId = req.body?.setupIntentId ? String(req.body.setupIntentId) : null;
  if (setupIntentId && !abo.stripeSubscriptionId) {
    const setup = await s.setupIntents.retrieve(setupIntentId);
    if (setup.status !== "succeeded" || !setup.payment_method) fail(400, "Carte non confirmée");
    if (setup.customer && abo.stripeCustomerId && setup.customer !== abo.stripeCustomerId) {
      fail(403, "Moyen de paiement non associé à cet abonnement");
    }
    const tarifId = setup.metadata?.tarifId;
    const tarif = tarifId ? await prisma.tarif.findUnique({ where: { id: tarifId } }) : null;
    if (!tarif) fail(400, "Forfait introuvable");
    const priceId = await prixStripe(s, tarif, setup.metadata?.periodicite === "annuel");
    if (!priceId) fail(400, "Ce forfait n'a pas de prix Stripe valide");
    const joursEssai = Math.min(730, Math.max(0, Math.trunc(Number(tarif.joursEssai) || 0)));
    const sub = await s.subscriptions.create({
      customer: abo.stripeCustomerId ?? setup.customer,
      items: [{ price: priceId }],
      default_payment_method: setup.payment_method,
      ...(joursEssai > 0 ? { trial_period_days: joursEssai } : {}),
      payment_behavior: "allow_incomplete",
      metadata: setup.metadata ?? {},
    });
    const maj = await prisma.abonnement.update({
      where: { id: abo.id },
      data: {
        stripeSubscriptionId: sub.id,
        statut: statutStripe(sub.status),
        plan: tarif.nom,
        prixMensuel: Number(tarif.prixMensuel),
        dateFin: sub.trial_end ? new Date(sub.trial_end * 1000) : (finPeriode(sub) ?? abo.dateFin),
      },
    });
    return ok(res, { statut: maj.statut, plan: maj.plan, dateFin: maj.dateFin, essai: joursEssai });
  }

  if (!abo.stripeSubscriptionId) return ok(res, { statut: abo.statut, plan: abo.plan, dateFin: abo.dateFin });

  const sub = await s.subscriptions.retrieve(abo.stripeSubscriptionId);
  const statut = statutStripe(sub.status);
  const tarifId = sub.metadata?.tarifId;
  const tarif = tarifId ? await prisma.tarif.findUnique({ where: { id: tarifId } }) : null;
  const maj = await prisma.abonnement.update({
    where: { id: abo.id },
    data: {
      statut,
      dateFin: finPeriode(sub) ?? abo.dateFin,
      plan: tarif?.nom ?? sub.metadata?.plan ?? abo.plan,
      prixMensuel: tarif ? Number(tarif.prixMensuel) : abo.prixMensuel,
    },
  });
  ok(res, { statut: maj.statut, plan: maj.plan, dateFin: maj.dateFin });
}));

router.post("/abonnements/checkout-session", auth(), ah(async (req, res) => {
  const s = await stripe();
  if (!s) fail(503, "Paiement indisponible : STRIPE_SECRET_KEY n'est pas configurée sur le serveur");
  // Le forfait peut être désigné par son identifiant (tarifId ou plan) ou par son nom.
  const tarif = await resoudreTarif(req.body);
  if (!tarif) {
    const disponibles = await prisma.tarif.findMany({ where: { actif: true }, select: { nom: true }, take: 20 });
    fail(404, `Forfait introuvable${String(req.body?.plan ?? "").trim() ? ` : « ${String(req.body.plan).trim()} »` : ""}`, { forfaitsDisponibles: disponibles.map((t) => t.nom) });
  }
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
    ...(Math.min(730, Math.max(0, Math.trunc(Number(tarif.joursEssai) || 0))) > 0
      ? { subscription_data: { trial_period_days: Math.min(730, Math.trunc(Number(tarif.joursEssai) || 0)) } }
      : {}),
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
  if (ev.type === "invoice.payment_succeeded" || ev.type === "invoice.payment_failed") {
    const o = ev.data.object;
    const subId = typeof o.subscription === "string" ? o.subscription : o.subscription?.id;
    if (subId) {
      await prisma.abonnement.updateMany({
        where: { stripeSubscriptionId: subId },
        data: { statut: ev.type === "invoice.payment_failed" ? "suspendu" : "actif" },
      });
    }
  }
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(ev.type)) {
    const sub = ev.data.object;
    const tarifId = sub.metadata?.tarifId;
    const tarif = tarifId ? await prisma.tarif.findUnique({ where: { id: tarifId } }) : null;
    await prisma.abonnement.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        statut: statutStripe(sub.status),
        ...(finPeriode(sub) ? { dateFin: finPeriode(sub) } : {}),
        ...(tarif ? { plan: tarif.nom, prixMensuel: Number(tarif.prixMensuel) } : {}),
      },
    });
  }
  res.json({ received: true });
}

export default router;
export { stripeWebhook };
