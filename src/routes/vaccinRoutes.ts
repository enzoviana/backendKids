import { Router } from 'express';
import { vaccinController } from '../controllers/vaccinController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/vaccins/enfant/:enfantId
 * Carnet vaccinal : chaque injection avec date, médecin prescripteur et rappel
 */
router.get(
  '/enfant/:enfantId',
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
 * POST /api/vaccins/enfant/:enfantId
 * Ajouter une injection au carnet vaccinal
 */
router.post(
  '/enfant/:enfantId',
  authorize(UserRole.medecin, UserRole.parent, UserRole.rsai),
  vaccinController.createVaccin
);

export default router;
