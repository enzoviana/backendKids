import { Router } from 'express';
import { presenceController } from '../controllers/presenceController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/presences/stats/:etablissementId
 * Évolution des présences des enfants
 * Query params: ?periode=semaine|mois
 */
router.get(
  '/stats/:etablissementId',
  authorize(UserRole.creche, UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  presenceController.getPresenceStats
);

export default router;
