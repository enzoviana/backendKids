import { Router } from 'express';
import { vaccinController } from '../controllers/vaccinController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router({ mergeParams: true });

/**
 * Routes alias pour compatibilité frontend
 * Ces routes permettent d'accéder aux vaccins via /api/enfants/:enfantId/vaccins
 * au lieu de /api/vaccins/enfant/:enfantId
 *
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/enfants/:enfantId/vaccins
 * Carnet vaccinal : chaque injection avec date, médecin prescripteur et rappel
 * ALIAS DE: GET /api/vaccins/enfant/:enfantId
 */
router.get(
  '/',
  authorize(
    UserRole.creche,
    UserRole.rsai,
    UserRole.medecin,
    UserRole.parent,
    UserRole.superadmin,
    UserRole.developpeur
  ),
  vaccinController.getVaccinsByEnfant
);

/**
 * POST /api/enfants/:enfantId/vaccins
 * Ajouter une injection au carnet vaccinal
 * ALIAS DE: POST /api/vaccins/enfant/:enfantId
 */
router.post(
  '/',
  authorize(UserRole.medecin, UserRole.parent, UserRole.rsai),
  vaccinController.createVaccin
);

export default router;
