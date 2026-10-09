import { Router } from 'express';
import { rsaiController } from '../controllers/rsaiController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/rsai
 * Annuaire des RSAI (non-admin)
 */
router.get(
  '/',
  authorize(UserRole.creche, UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  rsaiController.getRsai
);

/**
 * GET /api/rsai/me/affectations
 * Crèches où la RSAI est affectée, avec ses horaires de travail par jour et le périmètre GPS
 */
router.get(
  '/me/affectations',
  authorize(UserRole.rsai),
  rsaiController.getMyAffectations
);

/**
 * GET /api/rsai/:rsaiId
 * Fiche détaillée d'une RSAI (affectations, avis, stats)
 */
router.get(
  '/:rsaiId',
  authorize(UserRole.creche, UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  rsaiController.getRsaiById
);

/**
 * POST /api/rsai/:rsaiId/avis
 * La crèche note une RSAI (1 à 5) avec un commentaire
 */
router.post(
  '/:rsaiId/avis',
  authorize(UserRole.creche),
  rsaiController.createAvisRsai
);

export default router;
