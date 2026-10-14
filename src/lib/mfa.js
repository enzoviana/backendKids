// Double authentification sans SMS : application TOTP, appareils de confiance, passkeys.
const crypto = require("crypto");
const { prisma } = require("./core");

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function b32encode(buf) {
  let bits = 0, val = 0, out = "";
  for (const byte of buf) {
    val = (val << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
function b32decode(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0; const out = [];
  for (const c of clean) {
    val = (val << 5) | B32.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

// Chiffrement du secret TOTP en base (AES-256-GCM, clé dérivée de JWT_SECRET)
const KEY = () => crypto.createHash("sha256").update(`totp:${process.env.JWT_SECRET ?? "dev"}`).digest();
function seal(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", KEY(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
function unseal(s) {
  const [iv, tag, enc] = String(s).split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}
/** Vérifie un code à 6 chiffres (fenêtre ±30 s). Renvoie le pas utilisé ou null. */
function totpCheck(secret, code, lastStep) {
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now - 1, now, now + 1]) {
    if (lastStep != null && step <= lastStep) continue; // anti-rejeu
    const a = Buffer.from(hotp(secret, step)), b = Buffer.from(String(code).padStart(6, "0").slice(0, 6));
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return step;
  }
  return null;
}
const newSecret = () => b32encode(crypto.randomBytes(20));
const otpauthUrl = (secret, email) =>
  `otpauth://totp/${encodeURIComponent(`Kids'Med IA:${email}`)}?secret=${secret}&issuer=${encodeURIComponent("Kids'Med IA")}&digits=6&period=30`;

/** Vérifie le code de l'application d'authentification de l'utilisateur. */
async function verifyUserTotp(user, code) {
  if (!user.totpSecret) return false;
  const step = totpCheck(unseal(user.totpSecret), code, user.totpLastStep);
  if (step == null) return false;
  await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step } });
  return true;
}

// ---------- Appareils de confiance (30 jours) ----------
const TRUST_DAYS = 30;
async function createTrustedDevice(user, req) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.trustedDevice.create({
    data: {
      userId: user.id, tokenHash: sha(token),
      nom: String(req.body?.deviceName ?? req.headers["user-agent"] ?? "Appareil").slice(0, 120),
      expiresAt: new Date(Date.now() + TRUST_DAYS * 864e5),
    },
  });
  return token;
}
async function checkTrustedDevice(user, token) {
  if (!token) return false;
  const d = await prisma.trustedDevice.findUnique({ where: { tokenHash: sha(token) } });
  if (!d || d.userId !== user.id || d.expiresAt < new Date()) return false;
  await prisma.trustedDevice.update({ where: { id: d.id }, data: { lastUsedAt: new Date() } });
  return true;
}

/** Méthodes disponibles pour l'étape 2 de la connexion. */
async function methodsFor(user) {
  const passkeys = await prisma.passkey.count({ where: { userId: user.id } });
  return { totp: !!user.totpSecret, passkey: passkeys > 0, sms: !!user.telephone, email: true };
}

// ---------- Passkeys (WebAuthn) ----------
function rp() {
  const origins = (process.env.WEBAUTHN_ORIGINS || process.env.FRONTEND_URL || "http://localhost:8080").split(",").map((s) => s.trim());
  const rpID = process.env.WEBAUTHN_RP_ID || new URL(origins[0]).hostname;
  return { rpID, rpName: "Kids'Med IA", origins };
}

module.exports = { newSecret, otpauthUrl, seal, unseal, totpCheck, verifyUserTotp, createTrustedDevice, checkTrustedDevice, methodsFor, rp, sha, TRUST_DAYS };
