import { Router } from 'express';
import { logController } from '../controllers/logController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification admin
 */
router.use(authenticate);
router.use(requireAdmin);

/**
 * POST /api/logs
 * Créer un nouveau log (admin seulement)
 */
router.post('/', logController.createLog);

/**
 * GET /api/logs
 * Récupérer les logs avec filtres (admin seulement)
 * Query params: ?type=xxx&module=xxx&userId=xxx&dateDebut=xxx&dateFin=xxx&limit=xxx
 */
router.get('/', logController.getLogs);

/**
 * GET /api/logs/stats
 * Récupérer les statistiques des logs (admin seulement)
 */
router.get('/stats', logController.getLogStats);

/**
 * GET /api/logs/type/:type
 * Récupérer les logs par type (admin seulement)
 * Query params: ?limit=xxx
 */
router.get('/type/:type', logController.getLogsByType);

/**
 * GET /api/logs/user/:userId
 * Récupérer les logs d'un utilisateur (admin seulement)
 * Query params: ?limit=xxx
 */
router.get('/user/:userId', logController.getLogsByUser);

/**
 * DELETE /api/logs/clean
 * Nettoyer les anciens logs (admin seulement)
 * Query params: ?daysToKeep=xxx (défaut: 90)
 */
router.delete('/clean', logController.cleanOldLogs);

export default router;
