const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma, ok, fail, ah, required, auth, issueTokens, signAccess, publicUser, logSecu } = require("../lib/core");
const { sendSms, sendEmail } = require("../lib/services");
const mfa = require("../lib/mfa");
const wa = () => require("@simplewebauthn/server");

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Inscription (parent par défaut ; les autres rôles sont créés par l'admin)
router.post("/register", ah(async (req, res) => {
  required(req.body, ["email", "password"]);
  const { email, password, prenom, nom, telephone } = req.body;
  if (await prisma.user.findUnique({ where: { email } })) fail(409, "Cet e-mail est déjà utilisé");
  const user = await prisma.user.create({
    data: { email, prenom, nom, telephone, role: "parent", motDePasseHash: await bcrypt.hash(password, 10) },
  });
  await sendEmail(email, "Bienvenue sur Kids'Med", "auth-welcome", { prenom: prenom ?? "", lien_action: process.env.FRONTEND_URL ?? "" });
  ok(res, publicUser(user), 201);
}));

// Étape 1 : identifiants → jeton provisoire (avant SMS)
router.post("/login", ah(async (req, res) => {
  required(req.body, ["email", "password"]);
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password, user.motDePasseHash))) {
    await logSecu({ ip: req.ip, headers: req.headers, user }, "tentative_connexion", { autorise: false, motif: "mot_de_passe" });
    fail(401, "Email ou mot de passe incorrect");
  }
  if (!user.actif) fail(403, "Compte désactivé");
  // Réseau autorisé : si la crèche a une liste d'IP, les comptes crèche/RSAI doivent s'y connecter
  if (["creche", "rsai"].includes(user.role)) {
    const etabIds = user.role === "creche" ? [user.etablissementId].filter(Boolean)
      : (await prisma.affectation.findMany({ where: { rsaiId: user.id, statut: "active" }, select: { etablissementId: true } })).map((a) => a.etablissementId);
    const etabs = etabIds.length ? await prisma.etablissement.findMany({ where: { id: { in: etabIds } }, select: { ipsAutorisees: true } }) : [];
    const listes = etabs.map((e) => (Array.isArray(e.ipsAutorisees) ? e.ipsAutorisees : [])).filter((l) => l.length);
    const ip = String(req.headers["x-forwarded-for"] ?? req.ip ?? "").split(",")[0].trim().replace(/^::ffff:/, "");
    if (listes.length && !listes.some((l) => l.includes(ip))) {
      await logSecu({ ip: req.ip, headers: req.headers, user }, "tentative_connexion", { autorise: false, motif: "ip_refusee" });
      fail(403, "Connexion refusée pour raison de sécurité", { motif: "ip_refusee", securite: true });
    }
  }
  // Appareil de confiance (case « Se souvenir de cet appareil ») : pas de 2e étape pendant 30 jours
  if (await mfa.checkTrustedDevice(user, req.body.deviceToken)) {
    await logSecu({ ip: req.ip, headers: req.headers, user }, "connexion", { motif: "appareil_confiance" });
    return ok(res, { user: publicUser(user), ...(await issueTokens(user)), mfaRequired: false });
  }
  ok(res, { user: publicUser(user), accessToken: signAccess(user, false), mfaRequired: true, methodes: await mfa.methodsFor(user) });
}));

// Étape 2 : envoi du code SMS
router.post("/mfa/send-code", auth({ allowPreMfa: true }), ah(async (req, res) => {
  const code = String(crypto.randomInt(100000, 999999));
  await prisma.user.update({ where: { id: req.user.id }, data: { mfaCode: hash(code), mfaExpiresAt: new Date(Date.now() + 5 * 60e3) } });
  const canal = req.body?.canal === "email" || !req.user.telephone ? "email" : "sms";
  if (canal === "email") {
    await sendEmail(req.user.email, "Votre code de connexion Kids'Med", "auth-mfa-code",
      { prenom: req.user.prenom, code, expiration: "5 minutes" }, `Votre code de connexion Kids'Med : ${code} (valable 5 minutes).`);
  } else {
    const { cfg } = require("../lib/services"); const t = await cfg("MSG_MFA", "Kids'Med : votre code de connexion est {code} (valable 5 min)."); await sendSms(req.user.telephone, t.replace("{code}", code));
  }
  ok(res, { envoye: true, canal, telephone: req.user.telephone ? req.user.telephone.slice(-2) : null });
}));

// Étape 3 : vérification → vrais jetons
router.post("/mfa/verify-code", auth({ allowPreMfa: true }), ah(async (req, res) => {
  required(req.body, ["code"]);
  const u = req.user;
  const code = String(req.body.code);
  if (req.body.methode === "totp") {
    if (!(await mfa.verifyUserTotp(u, code))) fail(401, "Code de l'application incorrect");
  } else {
    const demo = process.env.MFA_DEMO_CODE && code === process.env.MFA_DEMO_CODE;
    if (!demo && (!u.mfaCode || !u.mfaExpiresAt || u.mfaExpiresAt < new Date() || u.mfaCode !== hash(code)))
      fail(401, "Code incorrect ou expiré");
    await prisma.user.update({ where: { id: u.id }, data: { mfaCode: null, mfaExpiresAt: null } });
  }
  await logSecu(req, "connexion", { motif: req.body.methode === "totp" ? "totp" : "code" });
  const deviceToken = req.body.rememberDevice ? await mfa.createTrustedDevice(u, req) : undefined;
  ok(res, { user: publicUser(u), ...(await issueTokens(u)), deviceToken });
}));

// ---------- Passkey (Face ID / Touch ID / clé de sécurité) à la connexion ----------
router.post("/mfa/passkey/options", auth({ allowPreMfa: true }), ah(async (req, res) => {
  const keys = await prisma.passkey.findMany({ where: { userId: req.user.id } });
  if (!keys.length) fail(400, "Aucune passkey enregistrée sur ce compte");
  const { rpID } = mfa.rp();
  const opts = await wa().generateAuthenticationOptions({ rpID, userVerification: "preferred",
    allowCredentials: keys.map((k) => ({ id: k.credentialId, transports: k.transports ?? undefined })) });
  await prisma.user.update({ where: { id: req.user.id }, data: { webauthnChallenge: opts.challenge } });
  ok(res, opts);
}));
router.post("/mfa/passkey/verify", auth({ allowPreMfa: true }), ah(async (req, res) => {
  required(req.body, ["response"]);
  const u = req.user;
  const key = await prisma.passkey.findUnique({ where: { credentialId: req.body.response.id } });
  if (!key || key.userId !== u.id || !u.webauthnChallenge) fail(401, "Passkey non reconnue");
  const { rpID, origins } = mfa.rp();
  let v;
  try {
    v = await wa().verifyAuthenticationResponse({ response: req.body.response, expectedChallenge: u.webauthnChallenge, expectedOrigin: origins, expectedRPID: rpID,
      authenticator: { credentialID: key.credentialId, credentialPublicKey: Buffer.from(key.publicKey, "base64url"), counter: key.counter, transports: key.transports ?? undefined } });
  } catch (e) { fail(401, "Vérification de la passkey impossible"); }
  if (!v.verified) fail(401, "Passkey refusée");
  await prisma.passkey.update({ where: { id: key.id }, data: { counter: v.authenticationInfo.newCounter, lastUsedAt: new Date() } });
  await prisma.user.update({ where: { id: u.id }, data: { webauthnChallenge: null } });
  await logSecu(req, "connexion", { motif: "passkey" });
  const deviceToken = req.body.rememberDevice ? await mfa.createTrustedDevice(u, req) : undefined;
  ok(res, { user: publicUser(u), ...(await issueTokens(u)), deviceToken });
}));

// ---------- Réglages de sécurité (compte connecté) ----------
router.get("/securite", auth(), ah(async (req, res) => {
  const [passkeys, appareils] = await Promise.all([
    prisma.passkey.findMany({ where: { userId: req.user.id }, select: { id: true, nom: true, createdAt: true, lastUsedAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.trustedDevice.findMany({ where: { userId: req.user.id, expiresAt: { gte: new Date() } }, select: { id: true, nom: true, createdAt: true, lastUsedAt: true, expiresAt: true }, orderBy: { createdAt: "desc" } }),
  ]);
  ok(res, { totp: !!req.user.totpSecret, passkeys, appareils });
}));

router.post("/totp/setup", auth(), ah(async (req, res) => {
  const secret = mfa.newSecret();
  await prisma.user.update({ where: { id: req.user.id }, data: { totpPendingSecret: mfa.seal(secret) } });
  ok(res, { secret, otpauthUrl: mfa.otpauthUrl(secret, req.user.email) });
}));
router.post("/totp/enable", auth(), ah(async (req, res) => {
  required(req.body, ["code"]);
  if (!req.user.totpPendingSecret) fail(400, "Relancez l'activation");
  const secret = mfa.unseal(req.user.totpPendingSecret);
  const step = mfa.totpCheck(secret, req.body.code, null);
  if (step == null) fail(400, "Code incorrect : vérifiez l'heure de votre téléphone");
  await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: req.user.totpPendingSecret, totpPendingSecret: null, totpLastStep: step } });
  await logSecu(req, "modification_securite", { motif: "totp_active" });
  ok(res, { totp: true });
}));
router.delete("/totp", auth(), ah(async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: null, totpPendingSecret: null, totpLastStep: null } });
  await logSecu(req, "modification_securite", { motif: "totp_desactive" });
  ok(res, { totp: false });
}));

router.post("/passkeys/register-options", auth(), ah(async (req, res) => {
  const keys = await prisma.passkey.findMany({ where: { userId: req.user.id } });
  const { rpID, rpName } = mfa.rp();
  const opts = await wa().generateRegistrationOptions({ rpName, rpID, userName: req.user.email,
    userID: new TextEncoder().encode(req.user.id), userDisplayName: `${req.user.prenom} ${req.user.nom}`.trim() || req.user.email,
    attestationType: "none", excludeCredentials: keys.map((k) => ({ id: k.credentialId })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" } });
  await prisma.user.update({ where: { id: req.user.id }, data: { webauthnChallenge: opts.challenge } });
  ok(res, opts);
}));
router.post("/passkeys", auth(), ah(async (req, res) => {
  required(req.body, ["response"]);
  const { rpID, origins } = mfa.rp();
  let v;
  try {
    v = await wa().verifyRegistrationResponse({ response: req.body.response, expectedChallenge: req.user.webauthnChallenge ?? "", expectedOrigin: origins, expectedRPID: rpID });
  } catch (e) { fail(400, "Enregistrement de la passkey impossible"); }
  if (!v.verified || !v.registrationInfo) fail(400, "Passkey refusée");
  const i = v.registrationInfo;
  const key = await prisma.passkey.create({ data: { userId: req.user.id, credentialId: i.credentialID, publicKey: Buffer.from(i.credentialPublicKey).toString("base64url"),
    counter: i.counter, transports: req.body.response.response?.transports ?? [], nom: String(req.body.nom ?? "Passkey").slice(0, 60) } });
  await prisma.user.update({ where: { id: req.user.id }, data: { webauthnChallenge: null } });
  await logSecu(req, "modification_securite", { motif: "passkey_ajoutee" });
  ok(res, { id: key.id, nom: key.nom }, 201);
}));
router.delete("/passkeys/:id", auth(), ah(async (req, res) => {
  const r = await prisma.passkey.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!r.count) fail(404, "Passkey introuvable");
  ok(res, { supprime: true });
}));
router.delete("/appareils/:id", auth(), ah(async (req, res) => {
  const r = await prisma.trustedDevice.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  if (!r.count) fail(404, "Appareil introuvable");
  ok(res, { supprime: true });
}));
router.delete("/appareils", auth(), ah(async (req, res) => {
  await prisma.trustedDevice.deleteMany({ where: { userId: req.user.id } });
  ok(res, { supprime: true });
}));

router.post("/refresh", ah(async (req, res) => {
  required(req.body, ["refreshToken"]);
  const t = await prisma.refreshToken.findUnique({ where: { token: req.body.refreshToken }, include: { user: true } });
  if (!t || t.expiresAt < new Date()) fail(401, "Session expirée");
  await prisma.refreshToken.delete({ where: { id: t.id } });
  ok(res, { user: publicUser(t.user), ...(await issueTokens(t.user)) });
}));

router.post("/logout", ah(async (req, res) => {
  if (req.body?.refreshToken) await prisma.refreshToken.deleteMany({ where: { token: req.body.refreshToken } });
  ok(res, { deconnecte: true });
}));

router.get("/me", auth(), ah(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, include: { etablissement: true } });
  ok(res, publicUser(u));
}));

router.post("/forgot-password", ah(async (req, res) => {
  required(req.body, ["email"]);
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const code = String(crypto.randomInt(100000, 999999));
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: hash(token) + ":" + hash(code), resetExpiresAt: new Date(Date.now() + 15 * 60e3) } });
    const lien = `${process.env.FRONTEND_URL ?? ""}/reinitialiser?token=${token}`;
    await sendEmail(user.email, "Réinitialisation de votre mot de passe", "auth-forgot-password",
      { prenom: user.prenom, lien_action: lien, code, expiration: "15 minutes" }, `Lien : ${lien} — code : ${code}`);
  }
  res.json({ success: true, message: "Si un compte existe, un lien de réinitialisation a été envoyé." });
}));

router.post("/reset-password", ah(async (req, res) => {
  required(req.body, ["nouveauMotDePasse"]);
  const { token, code, email, nouveauMotDePasse } = req.body;
  if (String(nouveauMotDePasse).length < 8) fail(400, "Le mot de passe doit contenir au moins 8 caractères");
  const candidates = await prisma.user.findMany({ where: { resetExpiresAt: { gte: new Date() }, ...(email ? { email } : {}) } });
  const user = candidates.find((u) => {
    const [t, c] = (u.resetToken ?? "").split(":");
    return (token && t === hash(token)) || (code && c === hash(String(code)));
  });
  if (!user) fail(400, "Lien ou code invalide ou expiré");
  await prisma.user.update({ where: { id: user.id }, data: { motDePasseHash: await bcrypt.hash(nouveauMotDePasse, 10), resetToken: null, resetExpiresAt: null } });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.trustedDevice.deleteMany({ where: { userId: user.id } });
  res.json({ success: true, message: "Mot de passe modifié" });
}));

module.exports = router;
