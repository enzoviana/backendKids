require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { prisma, HttpError } = require("./lib/core");
const { metricsMiddleware } = require("./lib/services");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const origins = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins, credentials: true }));
app.use(morgan("dev"));
app.use(metricsMiddleware);

// Webhook Stripe : corps brut, avant express.json
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), (req, res, next) =>
  require("./routes/abonnements").stripeWebhook(req, res).catch(next));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => res.json({ success: true, name: "Kids'Med IA API", docs: "/api/health" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/etablissements", require("./routes/etablissements"));
app.use("/api/coordination", require("./routes/coordination"));
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/enfants"));
app.use("/api", require("./routes/quotidien"));
app.use("/api", require("./routes/communication"));
app.use("/api", require("./routes/abonnements"));
app.use("/api", require("./routes/admin"));
app.use("/api", require("./routes/terrain"));

app.use("/api", (req, res) => res.status(404).json({ success: false, error: "Route non trouvée", method: req.method, path: req.originalUrl }));

// Gestion des erreurs → { success:false, error } + journal des erreurs serveur
app.use(async (err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Erreur serveur";
  if (err.code === "P2002") { status = 409; message = `Valeur déjà utilisée : ${err.meta?.target}`; }
  if (err.code === "P2025") { status = 404; message = "Élément introuvable"; }
  if (err.code === "P2003") { status = 400; message = `Référence invalide : ${err.meta?.field_name}`; }
  if (err.name === "PrismaClientValidationError") { status = 400; message = message.split("\n").filter(Boolean).slice(-1)[0]; }
  if (err.name === "MulterError") { status = 400; message = `Fichier refusé : ${err.message}`; }
  if (status >= 500) {
    console.error(err);
    const endpoint = `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`;
    await prisma.erreurServeur.upsert({ where: { message_endpoint: { message: message.slice(0, 300), endpoint } }, update: { count: { increment: 1 }, lastSeen: new Date(), resolved: false }, create: { message: message.slice(0, 300), endpoint } }).catch(() => {});
  }
  res.status(status).json({ success: false, error: message, ...(err instanceof HttpError ? err.extra : {}) });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Kids'Med API sur :${port}`));
