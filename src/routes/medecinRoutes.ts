import { Router } from 'express';
import { medecinController } from '../controllers/medecinController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/medecins
 * Annuaire des médecins (non-admin)
 * Query params: ?etablissementId=xxx
 */
router.get(
  '/',
  authorize(UserRole.creche, UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  medecinController.getMedecins
);

/**
 * GET /api/medecins/:medecinId
 * Fiche détaillée d'un médecin (enfants suivis, ordonnances récentes)
 */
router.get(
  '/:medecinId',
  authorize(UserRole.creche, UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  medecinController.getMedecinById
);

/**
 * GET /api/medecins/:medecinId/stats
 * Statistiques du médecin (patients, consultations, ordonnances par mois)
 */
router.get(
  '/:medecinId/stats',
  authorize(UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  medecinController.getMedecinStats
);

export default router;
