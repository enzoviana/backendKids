import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import os from 'os';
import prisma from '../config/prisma';

// Stockage en mémoire des métriques
const metricsStore = {
  requests: [] as { timestamp: number; duration: number; status: number }[],
  errors: [] as { timestamp: number; message: string; stack?: string; path: string }[],
};

// Nettoyer les anciennes métriques (garder seulement les 60 dernières minutes)
const cleanOldMetrics = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  metricsStore.requests = metricsStore.requests.filter(r => r.timestamp > oneHourAgo);
  metricsStore.errors = metricsStore.errors.filter(e => e.timestamp > oneHourAgo);
};

/**
 * Middleware pour tracker les requêtes
 */
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metricsStore.requests.push({
      timestamp: Date.now(),
      duration,
      status: res.statusCode,
    });
    cleanOldMetrics();
  });

  next();
};

/**
 * Logger les erreurs pour les métriques
 */
export const logError = (error: Error, path: string) => {
  metricsStore.errors.push({
    timestamp: Date.now(),
    message: error.message,
    stack: error.stack,
    path,
  });
  cleanOldMetrics();
};

/**
 * Contrôleur pour la console développeur
 */
export class DeveloperController {
  /**
   * GET /api/developer/metrics
   * Métriques techniques (requêtes, latence, CPU, mémoire)
   */
  async getMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      cleanOldMetrics();

      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;

      // Requêtes dans la dernière minute
      const recentRequests = metricsStore.requests.filter(r => r.timestamp > oneMinuteAgo);
      const requestsPerMinute = recentRequests.length;

      // Temps de réponse moyen
      const avgResponseTime = recentRequests.length > 0
        ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
        : 0;

      // Taux d'erreur
      const errorRequests = recentRequests.filter(r => r.status >= 400);
      const errorRate = recentRequests.length > 0
        ? (errorRequests.length / recentRequests.length) * 100
        : 0;

      // CPU et mémoire
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

      // Historique des 10 dernières minutes (par minute)
      const history = [];
      for (let i = 9; i >= 0; i--) {
        const bucketEnd = now - (i * 60 * 1000);
        const bucketStart = bucketEnd - 60 * 1000;
        const bucketRequests = metricsStore.requests.filter(
          r => r.timestamp >= bucketStart && r.timestamp < bucketEnd
        );

        history.push({
          timestamp: new Date(bucketEnd).toISOString(),
          requests: bucketRequests.length,
          avgResponseTime: bucketRequests.length > 0
            ? bucketRequests.reduce((sum, r) => sum + r.duration, 0) / bucketRequests.length
            : 0,
          errors: bucketRequests.filter(r => r.status >= 400).length,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          requestsPerMinute: Math.round(requestsPerMinute),
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 10) / 10,
          cpu: Math.round(cpuUsage * 10) / 10,
          memory: Math.round(memoryUsage * 10) / 10,
          uptime: Math.round(process.uptime()),
          history,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/health-detailed
   * Santé détaillée des services
   */
  async getHealthDetailed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = [];

      // Test PostgreSQL via Prisma
      let dbStatus = 'down';
      let dbLatency = 0;
      try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatency = Date.now() - start;
        dbStatus = 'up';
      } catch (error) {
        dbStatus = 'down';
      }

      services.push({
        name: 'PostgreSQL',
        status: dbStatus,
        latency: dbLatency,
      });

      // Système
      services.push({
        name: 'Système',
        status: 'up',
        details: {
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          uptime: Math.round(process.uptime()),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          services,
          overall: services.every(s => s.status === 'up') ? 'healthy' : 'degraded',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/errors
   * Erreurs récentes
   */
  async getErrors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      cleanOldMetrics();

      const limit = parseInt(req.query.limit as string) || 50;
      const errors = metricsStore.errors
        .slice(-limit)
        .reverse()
        .map(e => ({
          timestamp: new Date(e.timestamp).toISOString(),
          message: e.message,
          path: e.path,
          stack: e.stack,
        }));

      res.status(200).json({
        success: true,
        data: errors,
        total: metricsStore.errors.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/support/tickets
   * Tickets de support (tous)
   */
  async getSupportTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/database/stats
   * Statistiques de la base
   */
  async getDatabaseStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Compter les enregistrements dans chaque table
      const tables = [
        { name: 'User', count: await prisma.user.count() },
        { name: 'Enfant', count: await prisma.enfant.count() },
        { name: 'Etablissement', count: await prisma.etablissement.count() },
        { name: 'Personnel', count: await prisma.personnel.count() },
        { name: 'Abonnement', count: await prisma.abonnement.count() },
      ];

      // Taille de la base (nécessite une requête raw PostgreSQL)
      let dbSize: any = 0;
      try {
        const sizeResult = await prisma.$queryRaw<any[]>`
          SELECT pg_database_size(current_database()) as size
        `;
        dbSize = sizeResult[0]?.size || 0;
      } catch (error) {
        console.error('Erreur calcul taille DB:', error);
      }

      const totalSizeMB = Math.round(dbSize / (1024 * 1024) * 10) / 10;

      res.status(200).json({
        success: true,
        data: {
          tables,
          totalRecords: tables.reduce((sum, t) => sum + t.count, 0),
          totalSizeMB,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/endpoints
   * Liste des routes de l'API
   */
  async getEndpoints(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Récupérer l'app Express depuis req.app
      const app = req.app;
      const routes: any[] = [];

      // Fonction récursive pour extraire les routes
      const extractRoutes = (stack: any[], prefix = '') => {
        stack.forEach((middleware) => {
          if (middleware.route) {
            // Route directe
            const methods = Object.keys(middleware.route.methods)
              .filter(m => middleware.route.methods[m])
              .map(m => m.toUpperCase());

            routes.push({
              path: prefix + middleware.route.path,
              methods,
            });
          } else if (middleware.name === 'router' && middleware.handle.stack) {
            // Router imbriqué
            const routerPath = middleware.regexp
              .toString()
              .replace('/^', '')
              .replace('\\/?(?=\\/|$)/i', '')
              .replace(/\\\//g, '/')
              .replace(/\?/g, '')
              .replace(/\^/g, '');

            extractRoutes(middleware.handle.stack, prefix + routerPath);
          }
        });
      };

      extractRoutes(app._router.stack);

      // Grouper par chemin
      const groupedRoutes = routes.reduce((acc, route) => {
        const existing = acc.find((r: any) => r.path === route.path);
        if (existing) {
          existing.methods = [...new Set([...existing.methods, ...route.methods])];
        } else {
          acc.push(route);
        }
        return acc;
      }, [] as any[]);

      res.status(200).json({
        success: true,
        data: groupedRoutes.sort((a, b) => a.path.localeCompare(b.path)),
        total: groupedRoutes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/developer/support/tickets
   * Créer un ticket de support
   */
  async createSupportTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { titre, description, priorite, categorie } = req.body;

      res.status(201).json({
        success: true,
        data: {
          _id: 'temp-id',
          numero: 'TCK-0001',
          statut: 'ouvert',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/developer/support/tickets/mine
   * Tickets ouverts par l'utilisateur connecté
   */
  async getMySupportTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }
}

export const developerController = new DeveloperController();
