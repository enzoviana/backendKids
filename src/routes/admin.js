// Sécurité d'accès, logs, RGPD, console développeur, tickets, santé.
import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma, ok, fail, ah, required, auth, roles, isDev, isAdmin, notify, adminIds, logSecu, fullName } from '../lib/core.js';
import { verifierAcces, canAccessEnfant } from '../lib/access.js';
import { snapshot, metrics,  verifyFile } from '../lib/services.js';

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const devOnly = (req, _res, next) => (isDev(req.user) ? next() : next(Object.assign(new Error("Réservé au rôle développeur"), { status: 403 })));
const userSel = { select: { id: true, prenom: true, nom: true, role: true, email: true } };

// ---------- Configuration fournisseurs (développeur) ----------
import * as svc from '../lib/services.js';
const mask = (v) => (v ? `${v.slice(0, 3)}••••${v.slice(-4)}` : "");
router.get("/developer/config", auth(), devOnly, ah(async (_req, res) => {
  const out = {};
  for (const k of svc.CONFIG_KEYS) { const v = await svc.cfg(k); out[k] = svc.SECRET_KEYS.includes(k) ? mask(v) : v ?? ""; }
  ok(res, out);
}));
router.put("/developer/config", auth(), devOnly, ah(async (req, res) => {
  for (const k of svc.CONFIG_KEYS) {
    const v = req.body?.[k];
    if (typeof v !== "string" || (svc.SECRET_KEYS.includes(k) && !v.trim())) continue;
    await prisma.configEntry.upsert({ where: { key: k }, create: { key: k, value: v.trim() }, update: { value: v.trim() } });
  }
  svc.clearConfigCache();
  await logSecu(req, "config_modifiee", { autorise: true });
  ok(res, { enregistre: true });
}));
router.post("/developer/config/test", auth(), devOnly, ah(async (req, res) => {
  required(req.body, ["canal", "destinataire"]);
  const r = req.body.canal === "sms"
    ? await svc.sendSms(req.body.destinataire, "Kids'Med : test d'envoi SMS réussi.")
    : await svc.sendEmail(req.body.destinataire, "Test Kids'Med", "none", {}, "Test d'envoi e-mail réussi.");
  ok(res, r);
}));

// ---------- Santé ----------
router.get("/health", ah(async (_req, res) => {
  let db = "up";
  try { await prisma.$queryRaw`SELECT 1`; } catch { db = "down"; }
  res.json({ success: true, status: db === "up" ? "ok" : "degraded", database: db, uptime: Math.round(process.uptime()), timestamp: new Date() });
}));

// ---------- Fichiers signés ----------
router.get("/fichiers/:name", (req, res) => {
  const name = path.basename(req.params.name);
  if (!verifyFile(name, req.query.exp, req.query.sig)) return res.status(403).json({ success: false, error: "Lien expiré ou invalide" });
  const f = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(f)) return res.status(404).json({ success: false, error: "Fichier introuvable" });
  res.sendFile(f);
});

// ---------- Règles d'accès ----------
router.get("/securite/regles-acces", auth(), roles(), ah(async (_req, res) => {
  const r = await prisma.reglesAcces.findUnique({ where: { id: "global" } });
  ok(res, { plages: r?.plages ?? [], geofences: r?.geofences ?? [] });
}));
router.put("/securite/regles-acces", auth(), roles(), ah(async (req, res) => {
  ok(res, await prisma.reglesAcces.upsert({ where: { id: "global" }, update: { plages: req.body.plages ?? [], geofences: req.body.geofences ?? [] }, create: { id: "global", plages: req.body.plages ?? [], geofences: req.body.geofences ?? [] } }));
}));
router.post("/securite/verifier-acces", auth(), ah(async (req, res) => {
  required(req.body, ["enfantId"]);
  const r = await verifierAcces(req.user, req.body.enfantId, req.body.lat, req.body.lng);
  await logSecu(req, r.autorise ? "consultation_dossier" : "acces_refuse", { enfantId: req.body.enfantId, autorise: r.autorise, motif: r.motif, device: req.body.device ?? req.headers["user-agent"] });
  if (!r.autorise) await notify(await adminIds(), "Accès refusé", `${fullName(req.user)} — ${r.motif}`, "/admin/securite", "alerte");
  ok(res, r);
}));
router.get("/securite/alertes", auth(), roles(), ah(async (_req, res) => {
  const l = await prisma.logSecurite.findMany({ where: { autorise: false }, orderBy: { createdAt: "desc" }, take: 200 });
  const u = await prisma.user.findMany({ where: { id: { in: l.map((x) => x.userId).filter(Boolean) } }, ...userSel });
  ok(res, l.map((x) => ({ ...x, user: u.find((y) => y.id === x.userId) ?? null, adresse_ip: x.ip })));
}));

// ---------- Logs ----------
const shapeLog = (users) => (x) => ({ ...x, utilisateur: users.find((u) => u.id === x.userId) ?? null, date: x.createdAt, adresse_ip: x.ip });
router.get("/logs", auth(), roles(), ah(async (_req, res) => {
  const l = await prisma.logSecurite.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const u = await prisma.user.findMany({ where: { id: { in: l.map((x) => x.userId).filter(Boolean) } }, ...userSel });
  ok(res, l.map(shapeLog(u)));
}));
router.get("/logs/securite", auth(), roles(), ah(async (req, res) => {
  const l = await prisma.logSecurite.findMany({ where: { action: req.query.action ? String(req.query.action) : undefined, enfantId: req.query.enfantId ? String(req.query.enfantId) : undefined }, orderBy: { createdAt: "desc" }, take: 500 });
  const u = await prisma.user.findMany({ where: { id: { in: l.map((x) => x.userId).filter(Boolean) } }, ...userSel });
  const e = await prisma.enfant.findMany({ where: { id: { in: l.map((x) => x.enfantId).filter(Boolean) } }, select: { id: true, prenom: true } });
  ok(res, l.map((x) => ({ ...shapeLog(u)(x), enfant: e.find((y) => y.id === x.enfantId) ?? null })));
}));
router.get("/logs/securite/enfant/:enfantId", auth(), roles("creche", "parent"), ah(async (req, res) => {
  if (!(await canAccessEnfant(req.user, req.params.enfantId))) fail(403, "Permissions insuffisantes");
  const l = await prisma.logSecurite.findMany({ where: { enfantId: req.params.enfantId }, orderBy: { createdAt: "desc" }, take: 200 });
  const u = await prisma.user.findMany({ where: { id: { in: l.map((x) => x.userId).filter(Boolean) } }, ...userSel });
  ok(res, l.map(shapeLog(u)));
}));

// ---------- RGPD ----------
router.post("/rgpd/demandes", auth(), ah(async (req, res) => {
  required(req.body, ["type"]);
  const d = await prisma.demandeRgpd.create({ data: { userId: req.user.id, type: req.body.type, enfantId: req.body.enfantId || null, motif: req.body.motif, delaiLegal: new Date(Date.now() + 30 * 864e5) } });
  await notify(await adminIds(), "Demande RGPD", `${req.body.type} — ${fullName(req.user)}`, "/admin", "rgpd");
  ok(res, d, 201);
}));
router.get("/rgpd/demandes", auth(), roles(), ah(async (_req, res) => {
  const d = await prisma.demandeRgpd.findMany({ orderBy: { createdAt: "desc" } });
  const u = await prisma.user.findMany({ where: { id: { in: d.map((x) => x.userId) } }, ...userSel });
  ok(res, d.map((x) => ({ ...x, user: u.find((y) => y.id === x.userId) })));
}));
router.patch("/rgpd/demandes/:id", auth(), roles(), ah(async (req, res) => ok(res, await prisma.demandeRgpd.update({ where: { id: req.params.id }, data: { statut: req.body.statut } }))));
const periode = (q) => ({ gte: q.du ? new Date(String(q.du)) : new Date(0), lte: q.au ? new Date(String(q.au) + "T23:59:59") : new Date() });
router.get("/rgpd/registre", auth(), roles(), ah(async (req, res) => {
  const p = periode(req.query);
  const [consentements, demandes, accesDossiers, refus] = await Promise.all([
    prisma.consentement.count({ where: { date: p } }), prisma.demandeRgpd.count({ where: { createdAt: p } }),
    prisma.logSecurite.count({ where: { action: "consultation_dossier", createdAt: p } }), prisma.logSecurite.findMany({ where: { autorise: false, createdAt: p }, take: 50 }),
  ]);
  ok(res, {
    traitements: [
      { nom: "Dossier santé de l'enfant", finalite: "Suivi médical en collectivité", baseLegale: "Consentement explicite (art. 9-2-a RGPD)", duree: "Durée de l'accueil + 1 an" },
      { nom: "Comptes utilisateurs", finalite: "Authentification et sécurité", baseLegale: "Exécution du contrat", duree: "Durée du compte + 3 ans" },
      { nom: "Journaux d'accès", finalite: "Traçabilité des accès aux données de santé", baseLegale: "Obligation légale", duree: "1 an" },
      { nom: "Diagnostics IA", finalite: "Aide à l'orientation (non diagnostique)", baseLegale: "Consentement explicite", duree: "Durée de l'accueil" },
    ],
    consentements, demandes, accesDossiers,
    incidents: refus.map((r) => ({ date: r.createdAt, description: `Accès refusé (${r.motif})`, notifieCnil: false })),
  });
}));
router.get("/rgpd/export", auth(), roles(), ah(async (req, res) => {
  const p = periode(req.query), type = String(req.query.type ?? "tout"), format = String(req.query.format ?? "json");
  const data = {};
  if (type === "logs" || type === "tout") data.logs = await prisma.logSecurite.findMany({ where: { createdAt: p } });
  if (type === "consentements" || type === "tout") data.consentements = await prisma.consentement.findMany({ where: { date: p } });
  if (type === "demandes" || type === "tout") data.demandes = await prisma.demandeRgpd.findMany({ where: { createdAt: p } });
  if (format === "csv") {
    const rows = Object.entries(data).flatMap(([k, list]) => list.map((r) => ({ table: k, ...r })));
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const esc = (v) => `"${String(v instanceof Date ? v.toISOString() : typeof v === "object" && v ? JSON.stringify(v) : v ?? "").replace(/"/g, '""')}"`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="export-rgpd-${type}.csv"`);
    return res.send([cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n"));
  }
  res.setHeader("Content-Disposition", `attachment; filename="export-rgpd-${type}.json"`);
  res.json({ success: true, data });
}));

// ---------- Tickets ----------
router.post("/developer/support/tickets", auth(), ah(async (req, res) => {
  required(req.body, ["titre", "description"]);
  const n = (await prisma.ticket.count()) + 1;
  const t = await prisma.ticket.create({ data: { numero: `TCK-${String(n).padStart(4, "0")}`, auteurId: req.user.id, titre: req.body.titre, description: req.body.description, priorite: req.body.priorite ?? "normale", categorie: req.body.categorie ?? "question", page: req.body.page, device: req.body.device } });
  const devs = await prisma.user.findMany({ where: { role: { in: ["developpeur", "superadmin"] } }, select: { id: true } });
  await notify(devs.map((d) => d.id), `Ticket ${t.numero}`, t.titre, "/dev/support");
  ok(res, t, 201);
}));
router.get("/developer/support/tickets/mine", auth(), ah(async (req, res) => ok(res, await prisma.ticket.findMany({ where: { auteurId: req.user.id }, orderBy: { createdAt: "desc" } }))));
router.get("/developer/support/tickets", auth(), devOnly, ah(async (_req, res) => ok(res, await prisma.ticket.findMany({ orderBy: { createdAt: "desc" } }))));
router.patch("/developer/support/tickets/:id", auth(), devOnly, ah(async (req, res) => {
  const t = await prisma.ticket.update({ where: { id: req.params.id }, data: { statut: req.body.statut, priorite: req.body.priorite } });
  if (t.auteurId) await notify([t.auteurId], `Ticket ${t.numero} : ${t.statut}`, t.titre, "/profil");
  ok(res, t);
}));

// ---------- Console développeur ----------
router.get("/developer/metrics", auth(), devOnly, (_req, res) => res.json({ success: true, data: snapshot() }));
router.get("/developer/health-detailed", auth(), devOnly, ah(async (_req, res) => {
  const t = Date.now();
  let db = "up";
  try { await prisma.$queryRaw`SELECT 1`; } catch { db = "down"; }
  const dbMs = Date.now() - t;
  ok(res, { services: [
    { name: "PostgreSQL", status: db, latency: dbMs },
    { name: "API", status: "up", latency: 0 },
    { name: "SMS (Twilio)", status: process.env.TWILIO_ACCOUNT_SID ? "up" : "degraded", latency: 0 },
    { name: "E-mail (Resend)", status: process.env.RESEND_API_KEY ? "up" : "degraded", latency: 0 },
    { name: "Stripe", status: process.env.STRIPE_SECRET_KEY ? "up" : "degraded", latency: 0 },
    { name: "Stockage fichiers", status: fs.existsSync(UPLOAD_DIR) ? "up" : "down", latency: 0 },
  ] });
}));
router.get("/developer/errors", auth(), devOnly, ah(async (_req, res) => ok(res, await prisma.erreurServeur.findMany({ orderBy: { lastSeen: "desc" }, take: 200 }))));
router.patch("/developer/errors/:id", auth(), devOnly, ah(async (req, res) => ok(res, await prisma.erreurServeur.update({ where: { id: req.params.id }, data: { resolved: !!req.body.resolved } }))));
router.get("/developer/database/stats", auth(), devOnly, ah(async (_req, res) => {
  const rows = await prisma.$queryRaw`SELECT relname AS name, n_live_tup::int AS count, (pg_total_relation_size(relid) / 1048576.0)::float AS "sizeMB" FROM pg_stat_user_tables ORDER BY relname`;
  ok(res, { collections: rows, totalSizeMB: +rows.reduce((s, r) => s + Number(r.sizeMB), 0).toFixed(2) });
}));
router.get("/developer/endpoints", auth(), devOnly, (_req, res) => {
  const now = Date.now();
  const data = [...metrics.perEndpoint.entries()].map(([k, v]) => {
    const [method, ...p] = k.split(" ");
    return { method, path: p.join(" "), calls24h: v.calls.filter((t) => now - t < 864e5).length, avgMs: Math.round(v.totalMs / v.n) };
  }).sort((a, b) => b.calls24h - a.calls24h);
  res.json({ success: true, data });
});
const prismaCmd = (args) => new Promise((resolve) => {
  execFile("npx", ["prisma", ...args], { cwd: path.join(__dirname, "..", ".."), timeout: 120000 }, (err, stdout, stderr) => resolve({ ok: !err, output: `${stdout}\n${stderr}`.trim() }));
});
router.get("/developer/database/migrations/pending", auth(), devOnly, ah(async (_req, res) => {
  const r = await prismaCmd(["migrate", "status"]);
  res.json({ success: true, hasPendingMigrations: /not yet been applied|have not yet been applied|following migration/i.test(r.output), output: r.output });
}));
router.post("/developer/database/migrate", auth(), devOnly, ah(async (_req, res) => {
  const r = await prismaCmd(["migrate", "deploy"]);
  res.status(r.ok ? 200 : 500).json({ success: r.ok, output: r.output });
}));

export default router;
export { isAdmin };
