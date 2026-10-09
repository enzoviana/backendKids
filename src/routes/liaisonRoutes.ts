import { Router } from 'express';
import { liaisonController } from '../controllers/liaisonController';
import { authenticate, authorize, requireAdmin } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/liaisons/enfant/:enfantId
 * Personnes liées à un enfant (parents, médecins, crèche, RSAI)
 */
router.get(
  '/enfant/:enfantId',
  authorize(UserRole.creche, UserRole.rsai, UserRole.medecin, UserRole.superadmin, UserRole.developpeur),
  liaisonController.getLiaisonsByEnfant
);

/**
 * GET /api/liaisons
 * Toutes les liaisons enfant ↔ utilisateurs (vue admin)
 * Query params: ?enfantId=&userId=&role=
 */
router.get(
  '/',
  requireAdmin,
  liaisonController.getAllLiaisons
);

/**
 * POST /api/liaisons
 * Créer une liaison (admin ou crèche)
 */
router.post(
  '/',
  authorize(UserRole.superadmin, UserRole.developpeur, UserRole.creche),
  liaisonController.createLiaison
);

/**
 * DELETE /api/liaisons/:liaisonId
 * Révoquer une liaison
 */
router.delete(
  '/:liaisonId',
  authorize(UserRole.superadmin, UserRole.developpeur, UserRole.creche),
  liaisonController.deleteLiaison
);

export default router;
