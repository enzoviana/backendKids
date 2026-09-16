import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Initialisation de l'application Express
 */
const app: Application = express();

/**
 * Middlewares globaux
 */

// Logging des requêtes HTTP
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// CORS - Autoriser les requêtes depuis n'importe quelle origine
app.use(
  cors({
    origin: true, // Accepte toutes les origines
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parser le body des requêtes en JSON
app.use(express.json({ limit: '10mb' }));

// Parser les URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parser les cookies
app.use(cookieParser());

// Servir les fichiers statiques uploadés
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/**
 * Routes de l'API
 */
app.use('/api', routes);

/**
 * Route de base
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenue sur l\'API Kids\'Med IA',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

/**
 * Middleware de gestion des routes non trouvées
 */
app.use(notFoundHandler);

/**
 * Middleware de gestion des erreurs (doit être en dernier)
 */
app.use(errorHandler);

/**
 * Démarrage du serveur
 */
const startServer = async (): Promise<void> => {
  try {
    // Connexion à la base de données
    await connectDatabase();

    // Démarrage du serveur HTTP
    app.listen(env.port, () => {
      console.log('='.repeat(60));
      console.log(`🚀 Serveur Kids'Med IA démarré avec succès!`);
      console.log(`📍 URL: http://localhost:${env.port}`);
      console.log(`🌍 Environnement: ${env.nodeEnv}`);
      console.log(`🔒 CORS: Toutes les origines sont autorisées`);
      console.log('='.repeat(60));
      console.log('\n📚 Documentation des routes:');
      console.log(`   - Health check:     GET  http://localhost:${env.port}/api/health`);
      console.log(`   - Login:            POST http://localhost:${env.port}/api/auth/login`);
      console.log(`   - Register:         POST http://localhost:${env.port}/api/auth/register`);
      console.log(`   - Refresh token:    POST http://localhost:${env.port}/api/auth/refresh`);
      console.log(`   - Change password:  POST http://localhost:${env.port}/api/auth/change-password`);
      console.log(`   - Get profile:      GET  http://localhost:${env.port}/api/users/profile`);
      console.log(`   - Update profile:   PUT  http://localhost:${env.port}/api/users/profile`);
      console.log('='.repeat(60));
      console.log('\n⚠️  N\'oubliez pas de:');
      console.log('   1. Créer un fichier .env basé sur .env.example');
      console.log('   2. Configurer PostgreSQL');
      console.log('   3. Lancer les migrations Prisma: npm run prisma:migrate');
      console.log('   4. Lancer le seed: npm run prisma:seed');
      console.log('='.repeat(60));
    });

    // Gestion de l'arrêt propre du serveur
    process.on('SIGTERM', async () => {
      console.log('\n⚠️  Signal SIGTERM reçu. Arrêt du serveur...');
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n⚠️  Signal SIGINT reçu. Arrêt du serveur...');
      await disconnectDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Lancer le serveur
startServer();

export default app;
