// SMS, e-mail, stockage de fichiers et métriques.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

// ---------- Configuration (base > variables d'environnement) ----------
const CONFIG_KEYS = ["EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "GEOCODING_API_KEY", "MSG_MFA", "MSG_ALERTE_ACCES"];
const SECRET_KEYS = ["RESEND_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "GEOCODING_API_KEY"];
let cache = { at: 0, v: {} };
async function loadConfig() {
  if (Date.now() - cache.at < 30000) return cache.v;
  const { prisma } = require("./core");
  const rows = await prisma.configEntry.findMany().catch(() => []);
  cache = { at: Date.now(), v: Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  return cache.v;
}
async function cfg(key, def) {
  const v = (await loadConfig())[key];
  return v || process.env[key] || (key === "EMAIL_FROM" ? process.env.MAIL_FROM : undefined) || def;
}
const clearConfigCache = () => { cache.at = 0; };

// ---------- SMS (Twilio si configuré, sinon console) ----------
async function sendSms(to, body) {
  const sid = await cfg("TWILIO_ACCOUNT_SID"), tok = await cfg("TWILIO_AUTH_TOKEN"), from = await cfg("TWILIO_FROM");
  if (!sid || !tok || !from || !to) {
    console.log(`[SMS simulé] → ${to ?? "(aucun numéro)"} : ${body}`);
    return { simulated: true };
  }
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${await r.text()}`);
  return { simulated: false };
}

// ---------- E-mail (Resend si configuré, sinon console) ----------
const TEMPLATES_DIR = path.join(__dirname, "..", "..", "email-templates");
function renderTemplate(name, vars) {
  const file = path.join(TEMPLATES_DIR, `${name}.html`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
async function sendEmail(to, subject, template, vars, fallbackText) {
  const html = renderTemplate(template, vars) ?? `<p>${fallbackText ?? subject}</p>`;
  const key = await cfg("RESEND_API_KEY");
  if (!key) {
    console.log(`[E-mail simulé] → ${to} : ${subject}\n${fallbackText ?? ""}`);
    return { simulated: true };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: await cfg("EMAIL_FROM", "Kids'Med <noreply@kidsmed.fr>"), to, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return { simulated: false };
}

// ---------- Fichiers (disque local, URL signée) ----------
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const signFile = (name, ttlSec = 3600) => {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = crypto.createHmac("sha256", process.env.JWT_SECRET || "change-me").update(`${name}:${exp}`).digest("hex").slice(0, 32);
  const base = process.env.PUBLIC_URL || "";
  return `${base}/api/fichiers/${encodeURIComponent(name)}?exp=${exp}&sig=${sig}`;
};
const verifyFile = (name, exp, sig) => {
  if (!exp || Number(exp) < Date.now() / 1000) return false;
  const good = crypto.createHmac("sha256", process.env.JWT_SECRET || "change-me").update(`${name}:${exp}`).digest("hex").slice(0, 32);
  return sig === good;
};

// ---------- Métriques réelles ----------
const metrics = { started: Date.now(), total: 0, errors: 0, durations: [], perEndpoint: new Map(), history: [], minute: [] };
function metricsMiddleware(req, res, next) {
  const t = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    metrics.total++;
    if (res.statusCode >= 500) metrics.errors++;
    metrics.durations.push(ms);
    if (metrics.durations.length > 1000) metrics.durations.shift();
    metrics.minute.push(Date.now());
    const key = `${req.method} ${req.route?.path ? req.baseUrl + req.route.path : req.path}`;
    const e = metrics.perEndpoint.get(key) ?? { calls: [], totalMs: 0, n: 0 };
    e.calls.push(Date.now()); e.totalMs += ms; e.n++;
    metrics.perEndpoint.set(key, e);
  });
  next();
}
setInterval(() => {
  const now = Date.now();
  metrics.minute = metrics.minute.filter((t) => now - t < 60e3);
  const avg = metrics.durations.length ? metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length : 0;
  metrics.history.push({ time: new Date().toTimeString().slice(0, 5), requests: metrics.minute.length, latency: Math.round(avg) });
  if (metrics.history.length > 144) metrics.history.shift();
}, 10 * 60e3).unref();

function snapshot() {
  const now = Date.now();
  const rpm = metrics.minute.filter((t) => now - t < 60e3).length;
  const avg = metrics.durations.length ? metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length : 0;
  return {
    requestsPerMinute: rpm,
    avgResponseTime: Math.round(avg),
    errorRate: metrics.total ? +((metrics.errors / metrics.total) * 100).toFixed(2) : 0,
    cpu: Math.min(100, +((os.loadavg()[0] / os.cpus().length) * 100).toFixed(1)),
    memory: +((process.memoryUsage().rss / os.totalmem()) * 100).toFixed(1),
    uptime: Math.round(process.uptime()),
    totalRequests: metrics.total,
    history: metrics.history.length ? metrics.history : [{ time: new Date().toTimeString().slice(0, 5), requests: rpm, latency: Math.round(avg) }],
  };
}

module.exports = { cfg, CONFIG_KEYS, SECRET_KEYS, clearConfigCache, sendSms, sendEmail, UPLOAD_DIR, signFile, verifyFile, metrics, metricsMiddleware, snapshot };
