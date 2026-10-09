import { Router } from 'express';
import { alerteController } from '../controllers/alerteController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/alertes/symptome
 * Créer une alerte symptôme
 */
router.post(
  '/symptome',
  authorize(UserRole.rsai, UserRole.creche, UserRole.medecin),
  alerteController.createAlerteSymptome
);

/**
 * GET /api/alertes/etablissement/:etablissementId
 * Récupérer les alertes d'un établissement
 */
router.get(
  '/etablissement/:etablissementId',
  authorize(UserRole.rsai, UserRole.creche, UserRole.superadmin, UserRole.developpeur),
  alerteController.getAlertesByEtablissement
);

export default router;
