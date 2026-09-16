import { Router } from 'express';
import { diagnosticController } from '../controllers/diagnosticController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/diagnostics
 * Créer un nouveau diagnostic IA
 */
router.post('/', diagnosticController.createDiagnostic);

/**
 * GET /api/diagnostics/enfant/:enfantId
 * Récupérer les diagnostics d'un enfant
 */
router.get('/enfant/:enfantId', diagnosticController.getDiagnosticsByEnfant);

/**
 * GET /api/diagnostics/stats
 * Récupérer les statistiques des diagnostics
 */
router.get('/stats', diagnosticController.getDiagnosticStats);

/**
 * GET /api/diagnostics/:id
 * Récupérer un diagnostic par ID
 */
router.get('/:id', diagnosticController.getDiagnosticById);

/**
 * DELETE /api/diagnostics/:id
 * Supprimer un diagnostic
 */
router.delete('/:id', diagnosticController.deleteDiagnostic);

export default router;
