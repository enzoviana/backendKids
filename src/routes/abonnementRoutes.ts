import { Router } from 'express';
import { abonnementController } from '../controllers/abonnementController';
import { authenticate, requireAdmin, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

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

/**
 * GET /api/abonnements/me
 * Abonnement de l'utilisateur connecté
 */
router.get(
  '/me',
  authorize(UserRole.medecin, UserRole.superadmin, UserRole.developpeur, UserRole.creche, UserRole.rsai),
  abonnementController.getMyAbonnement
);

/**
 * GET /api/abonnements/revenus
 * Revenus mensuels (MRR) par plan
 * Query params: ?annee=2026
 */
router.get('/revenus', requireAdmin, abonnementController.getRevenus);

/**
 * POST /api/abonnements/checkout-session
 * Crée une session de paiement Stripe
 */
router.post(
  '/checkout-session',
  authorize(UserRole.creche, UserRole.rsai, UserRole.medecin, UserRole.parent),
  abonnementController.createCheckoutSession
);

/**
 * POST /api/abonnements/portail
 * Lien vers le portail client Stripe
 */
router.post(
  '/portail',
  authorize(UserRole.creche, UserRole.rsai, UserRole.medecin, UserRole.parent),
  abonnementController.createPortalSession
);

/**
 * PUT /api/abonnements/:id/attribuer
 * L'admin attribue ou change la formule d'un compte sans paiement
 */
router.put('/:id/attribuer', requireAdmin, abonnementController.attribuerAbonnement);

export default router;
