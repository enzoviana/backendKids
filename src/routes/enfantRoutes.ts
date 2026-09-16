import { Router } from 'express';
import { enfantController } from '../controllers/enfantController';
import { authenticate, requireProfessional } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/enfants
 * Créer un nouvel enfant (professionnel uniquement)
 */
router.post('/', requireProfessional, enfantController.createEnfant.bind(enfantController));

/**
 * GET /api/enfants
 * Récupérer tous les enfants (SuperAdmin uniquement)
 */
router.get('/', enfantController.getAllEnfants.bind(enfantController));

/**
 * GET /api/enfants/etablissement/:etablissementId
 * Récupérer les enfants d'un établissement
 */
router.get(
  '/etablissement/:etablissementId',
  enfantController.getEnfants.bind(enfantController)
);

/**
 * POST /api/enfants/lier-parent
 * Lier un parent à un enfant via le code confidentiel
 */
router.post('/lier-parent', enfantController.lierParent.bind(enfantController));

/**
 * GET /api/enfants/:id
 * Récupérer un enfant par ID
 */
router.get('/:id', enfantController.getEnfantById.bind(enfantController));

/**
 * PUT /api/enfants/:id
 * Mettre à jour un enfant (professionnel uniquement)
 */
router.put('/:id', requireProfessional, enfantController.updateEnfant.bind(enfantController));

/**
 * POST /api/enfants/:id/regenerer-code
 * Régénérer le code confidentiel (professionnel uniquement)
 */
router.post(
  '/:id/regenerer-code',
  requireProfessional,
  enfantController.regenererCode.bind(enfantController)
);

/**
 * DELETE /api/enfants/:id
 * Supprimer un enfant (professionnel uniquement)
 */
router.delete('/:id', requireProfessional, enfantController.deleteEnfant.bind(enfantController));

export default router;
