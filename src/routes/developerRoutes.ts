import { Router } from 'express';
import { developerController } from '../controllers/developerController';
import { authenticate, requireDeveloper } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification développeur
 */
router.use(authenticate);
router.use(requireDeveloper);

/**
 * GET /api/developer/metrics
 * Métriques techniques (requêtes, latence, CPU, mémoire)
 */
router.get('/metrics', developerController.getMetrics);

/**
 * GET /api/developer/health-detailed
 * Santé détaillée des services
 */
router.get('/health-detailed', developerController.getHealthDetailed);

/**
 * GET /api/developer/errors
 * Erreurs récentes
 */
router.get('/errors', developerController.getErrors);

/**
 * GET /api/developer/support/tickets
 * Tickets de support (tous)
 */
router.get('/support/tickets', developerController.getSupportTickets);

/**
 * GET /api/developer/database/stats
 * Statistiques de la base
 */
router.get('/database/stats', developerController.getDatabaseStats);

/**
 * GET /api/developer/endpoints
 * Liste des routes de l'API
 */
router.get('/endpoints', developerController.getEndpoints);

/**
 * POST /api/developer/support/tickets
 * Créer un ticket de support (accessible à tous les rôles authentifiés)
 */
router.post(
  '/support/tickets',
  authenticate,
  developerController.createSupportTicket
);

/**
 * GET /api/developer/support/tickets/mine
 * Tickets ouverts par l'utilisateur connecté (accessible à tous)
 */
router.get(
  '/support/tickets/mine',
  authenticate,
  developerController.getMySupportTickets
);

export default router;
