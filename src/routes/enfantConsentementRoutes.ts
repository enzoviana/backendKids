import { Router } from 'express';
import { consentementController } from '../controllers/consentementController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router({ mergeParams: true });

/**
 * Routes alias pour compatibilité frontend
 * Ces routes permettent d'accéder aux consentements via /api/enfants/:enfantId/consentements
 * au lieu de /api/consentements/enfant/:enfantId
 *
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/enfants/:enfantId/consentements
 * Registre des consentements parentaux
 * ALIAS DE: GET /api/consentements/enfant/:enfantId
 */
router.get(
  '/',
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
 * PUT /api/enfants/:enfantId/consentements/:type
 * Accorder / retirer un consentement (signature horodatée)
 * ALIAS DE: PUT /api/consentements/enfant/:enfantId/:type
 */
router.put(
  '/:type',
  authorize(UserRole.parent),
  consentementController.updateConsentement
);

export default router;
