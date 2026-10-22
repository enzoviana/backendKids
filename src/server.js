import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma, HttpError } from './lib/core.js';
import { metricsMiddleware } from './lib/services.js';
import authRoutes from './routes/auth.js';
import etablissementsRoutes from './routes/etablissements.js';
import coordinationRoutes from './routes/coordination.js';
import usersRoutes from './routes/users.js';
import enfantsRoutes from './routes/enfants.js';
import quotidienRoutes from './routes/quotidien.js';
import communicationRoutes from './routes/communication.js';
import abonnementsRoutes from './routes/abonnements.js';
import adminRoutes from './routes/admin.js';
import terrainRoutes from './routes/terrain.js';

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const origins = (process.env.CORS_ORIGINS || "*").split(",").map((s) => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins, credentials: true }));
app.use(morgan("dev"));
app.use(metricsMiddleware);

// Webhook Stripe : corps brut, AVANT express.json
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    await abonnementsRoutes.stripeWebhook(req, res);
  } catch (err) {
    next(err);
  }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => res.json({ success: true, name: "Kids'Med IA API", docs: "/api/health" }));
app.use("/api/auth", authRoutes);
app.use("/api/etablissements", etablissementsRoutes);
app.use("/api/coordination", coordinationRoutes);
app.use("/api", usersRoutes);
app.use("/api", enfantsRoutes);
app.use("/api", quotidienRoutes);
app.use("/api", communicationRoutes);
app.use("/api", abonnementsRoutes);
app.use("/api", adminRoutes);
app.use("/api", terrainRoutes);

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
