import { Router } from 'express';
import { rendezVousController } from '../controllers/rendezVousController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/rendez-vous/medecin/:medecinId
 * Agenda / consultations du médecin
 * Query params: ?date=YYYY-MM-DD
 */
router.get(
  '/medecin/:medecinId',
  authorize(UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  rendezVousController.getRendezVousMedecin
);

export default router;
