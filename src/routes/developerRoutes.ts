import { Router } from 'express';
import { developerController } from '../controllers/developerController';
import { authenticate, requireDeveloper } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent au minimum une authentification
 */
router.use(authenticate);

/**
 * GET /api/developer/metrics
 * Métriques techniques (requêtes, latence, CPU, mémoire) - Développeurs uniquement
 */
router.get('/metrics', requireDeveloper, developerController.getMetrics);

/**
 * GET /api/developer/health-detailed
 * Santé détaillée des services - Développeurs uniquement
 */
router.get('/health-detailed', requireDeveloper, developerController.getHealthDetailed);

/**
 * GET /api/developer/errors
 * Erreurs récentes - Développeurs uniquement
 */
router.get('/errors', requireDeveloper, developerController.getErrors);

/**
 * GET /api/developer/support/tickets
 * Tickets de support (tous) - Développeurs uniquement
 */
router.get('/support/tickets', requireDeveloper, developerController.getSupportTickets);

/**
 * GET /api/developer/database/stats
 * Statistiques de la base - Développeurs uniquement
 */
router.get('/database/stats', requireDeveloper, developerController.getDatabaseStats);

/**
 * GET /api/developer/endpoints
 * Liste des routes de l'API - Développeurs uniquement
 */
router.get('/endpoints', requireDeveloper, developerController.getEndpoints);

/**
 * POST /api/developer/support/tickets
 * Créer un ticket de support (accessible à tous les rôles authentifiés)
 */
router.post(
  '/support/tickets',
  developerController.createSupportTicket
);

/**
 * GET /api/developer/support/tickets/mine
 * Tickets ouverts par l'utilisateur connecté (accessible à tous)
 */
router.get(
  '/support/tickets/mine',
  developerController.getMySupportTickets
);

export default router;
