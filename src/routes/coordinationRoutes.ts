import { Router } from 'express';
import { coordinationController } from '../controllers/coordinationController';
import { authenticate, requireAdmin, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/coordination/avis
 * Avis réciproques crèche/RSAI
 */
router.get(
  '/avis',
  authorize(UserRole.creche, UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  coordinationController.getAvis
);

/**
 * GET /api/coordination/affectations
 * Affectations RSAI : admin toutes, crèche les siennes, RSAI ses affectations
 */
router.get(
  '/affectations',
  authorize(UserRole.creche, UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  coordinationController.getAffectations
);

/**
 * POST /api/coordination/affectations
 * Admin uniquement : affecter une RSAI à une crèche
 */
router.post(
  '/affectations',
  requireAdmin,
  coordinationController.createAffectation
);

/**
 * DELETE /api/coordination/affectations/:affectationId
 * Révoquer une affectation (admin)
 */
router.delete(
  '/affectations/:affectationId',
  requireAdmin,
  coordinationController.deleteAffectation
);

/**
 * GET /api/coordination/demandes-rsai
 * Crèche : ses demandes ; admin : toutes les demandes d'intervention RSAI
 */
router.get(
  '/demandes-rsai',
  authorize(UserRole.creche, UserRole.superadmin, UserRole.developpeur),
  coordinationController.getDemandesRsai
);

/**
 * POST /api/coordination/demandes-rsai
 * La crèche demande une RSAI
 */
router.post(
  '/demandes-rsai',
  authorize(UserRole.creche),
  coordinationController.createDemandeRsai
);

/**
 * PATCH /api/coordination/demandes-rsai/:demandeId
 * Admin traite une demande (accepter/refuser)
 */
router.patch(
  '/demandes-rsai/:demandeId',
  requireAdmin,
  coordinationController.updateDemandeRsai
);

export default router;
