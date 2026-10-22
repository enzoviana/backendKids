import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const prisma = new PrismaClient();

/** Ajoute `_id` (attendu par le frontend) partout où il y a un `id`. */
function withMongoIds(v) {
  if (Array.isArray(v)) return v.map(withMongoIds);
  if (v instanceof Date || v === null || typeof v !== "object") return v;
  const o = {};
  for (const [k, val] of Object.entries(v)) {
    if (k === "motDePasseHash" || k === "mfaCode" || k === "resetToken") continue;
    o[k] = withMongoIds(val);
  }
  if (o.id && !o._id) o._id = o.id;
  return o;
}

const ok = (res, data, status = 200, extra = {}) =>
  res.status(status).json({ success: true, data: withMongoIds(data), ...extra });

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};

/** Wrapper async → erreurs envoyées au gestionnaire global. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function required(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || body?.[f] === "");
  if (missing.length) fail(400, `Champs manquants : ${missing.join(", ")}`, { received: body });
}

const ADMIN = ["admin", "superadmin"];
const DEV = ["developpeur", "developer", "dev"];
const isAdmin = (u) => ADMIN.includes(u?.role) || DEV.includes(u?.role);
const isDev = (u) => DEV.includes(u?.role) || u?.role === "superadmin";

// ---------- JWT ----------
const secret = () => process.env.JWT_SECRET || "change-me";
const signAccess = (user, mfa = true) =>
  jwt.sign({ sub: user.id, role: user.role, mfa }, secret(), { expiresIn: mfa ? "15m" : "10m" });

async function issueTokens(user) {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 864e5) },
  });
  return { accessToken: signAccess(user, true), refreshToken };
}

/** Exige un jeton. `allowPreMfa` autorise le jeton émis avant la vérification SMS. */
function auth(opts = {}) {
  return ah(async (req, _res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) fail(401, "Token d'authentification manquant");
    let p;
    try {
      p = jwt.verify(token, secret());
    } catch {
      fail(401, "Token invalide ou expiré");
    }
    if (!p.mfa && !opts.allowPreMfa) fail(401, "Vérification par SMS requise");
    const user = await prisma.user.findUnique({ where: { id: p.sub } });
    if (!user || !user.actif) fail(401, "Compte introuvable ou désactivé");
    req.user = user;
    next();
  });
}

/** Restreint à certains rôles (admin et dev passent toujours). */
const roles = (...allowed) => (req, _res, next) => {
  const r = req.user?.role;
  if (isAdmin(req.user) || allowed.includes(r)) return next();
  next(new HttpError(403, "Permissions insuffisantes"));
};

const publicUser = (u) => {
  if (!u) return u;
  const { motDePasseHash, mfaCode, mfaExpiresAt, resetToken, resetExpiresAt, ...rest } = u;
  return rest;
};

const fullName = (u) => [u?.prenom, u?.nom].filter(Boolean).join(" ") || u?.email || "";

async function notify(userIds, titre, message, lien, type = "info") {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  await prisma.notification.createMany({ data: ids.map((userId) => ({ userId, titre, message, lien, type })) });
}

async function adminIds() {
  const a = await prisma.user.findMany({ where: { role: { in: ADMIN } }, select: { id: true } });
  return a.map((x) => x.id);
}

async function logSecu(req, action, extra = {}) {
  await prisma.logSecurite
    .create({
      data: {
        userId: req.user?.id,
        action,
        ip: req.ip,
        device: req.headers["user-agent"]?.slice(0, 200),
        ...extra,
      },
    })
    .catch(() => {});
  if (extra.autorise === false) {
    const u = req.user;
    const nom = u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || u.email : "Inconnu";
    const ids = await adminIds().catch(() => []);
    const dev = await prisma.user.findMany({ where: { role: { in: DEV } }, select: { id: true } }).catch(() => []);
    await notify([...ids, ...dev.map((d) => d.id)], "Accès refusé par sécurité", `${nom} : ${extra.motif ?? action} (IP ${req.ip})`, "/admin/securite", "alerte").catch(() => {});
  }
}

const toDate = (v) => (v ? new Date(v) : undefined);
const genCode = (prenom = "ENF") =>
  `${prenom.normalize("NFD").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")}-${crypto.randomInt(1000, 9999)}`;

export {
  prisma, ok, fail, ah, HttpError, required, auth, roles, isAdmin, isDev, ADMIN, DEV,
  issueTokens, signAccess, publicUser, fullName, notify, adminIds, logSecu, toDate, genCode, withMongoIds,
};
