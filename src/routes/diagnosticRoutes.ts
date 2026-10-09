import { Router } from 'express';
import { diagnosticController } from '../controllers/diagnosticController';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { UserRole } from '@prisma/client';

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

/**
 * GET /api/diagnostics
 * Liste des diagnostics IA récents (pas de route de liste globale)
 * Query params: ?etablissementId=&limit=
 */
router.get(
  '/',
  authorize(UserRole.rsai, UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  diagnosticController.getAllDiagnostics
);

/**
 * POST /api/diagnostics/analyser
 * Analyse IA des symptômes (multipart/form-data)
 */
router.post(
  '/analyser',
  upload.single('photo'),
  diagnosticController.analyserSymptomes
);

/**
 * POST /api/diagnostics/:id/retour-medecin
 * Retour du médecin sur l'exactitude du diagnostic IA
 */
router.post(
  '/:id/retour-medecin',
  authorize(UserRole.medecin),
  diagnosticController.retourMedecin
);

export default router;
