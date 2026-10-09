import { Router } from 'express';
import { consentementController } from '../controllers/consentementController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/consentements/enfant/:enfantId
 * Registre des consentements parentaux
 */
router.get(
  '/enfant/:enfantId',
  authorize(
    UserRole.creche,
    UserRole.parent,
    UserRole.superadmin,
    UserRole.developpeur,
    UserRole.rsai
  ),
  consentementController.getConsentementsByEnfant
);

/**
 * PUT /api/consentements/enfant/:enfantId/:type
 * Accorder / retirer un consentement (signature horodatée)
 */
router.put(
  '/enfant/:enfantId/:type',
  authorize(UserRole.parent),
  consentementController.updateConsentement
);

export default router;
