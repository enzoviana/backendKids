import { Router } from 'express';
import { abonnementController } from '../controllers/abonnementController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/abonnements
 * Créer un nouvel abonnement (admin seulement)
 */
router.post('/', requireAdmin, abonnementController.createAbonnement);

/**
 * GET /api/abonnements
 * Récupérer tous les abonnements (admin seulement)
 */
router.get('/', requireAdmin, abonnementController.getAllAbonnements);

/**
 * GET /api/abonnements/stats
 * Récupérer les statistiques des abonnements (admin seulement)
 */
router.get('/stats', requireAdmin, abonnementController.getAbonnementStats);

/**
 * GET /api/abonnements/etablissement/:etablissementId
 * Récupérer l'abonnement d'un établissement
 */
router.get('/etablissement/:etablissementId', abonnementController.getAbonnementByEtablissement);

/**
 * PUT /api/abonnements/:id
 * Mettre à jour un abonnement (admin seulement)
 */
router.put('/:id', requireAdmin, abonnementController.updateAbonnement);

/**
 * PATCH /api/abonnements/:id/suspendre
 * Suspendre un abonnement (admin seulement)
 */
router.patch('/:id/suspendre', requireAdmin, abonnementController.suspendreAbonnement);

/**
 * PATCH /api/abonnements/:id/reactiver
 * Réactiver un abonnement (admin seulement)
 */
router.patch('/:id/reactiver', requireAdmin, abonnementController.reactiverAbonnement);

export default router;
