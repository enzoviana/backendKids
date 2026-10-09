import { Router } from 'express';
import { etablissementController } from '../controllers/etablissementController';
import { authenticate, requireAdmin, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Routes pour la gestion des établissements
 * Toutes les routes nécessitent une authentification
 */

// Récupérer tous les établissements
router.get('/', authenticate, etablissementController.getAllEtablissements);

// Récupérer un établissement par ID
router.get('/:id', authenticate, etablissementController.getEtablissementById);

// Récupérer les statistiques d'un établissement
router.get('/:id/stats', authenticate, etablissementController.getEtablissementStats);

// Créer un nouvel établissement (admin only)
router.post('/', authenticate, requireAdmin, etablissementController.createEtablissement);

// Mettre à jour un établissement
router.put('/:id', authenticate, etablissementController.updateEtablissement);

// Désactiver un établissement (admin only)
router.patch('/:id/deactivate', authenticate, requireAdmin, etablissementController.deactivateEtablissement);

// Supprimer un établissement (admin only)
router.delete('/:id', authenticate, requireAdmin, etablissementController.deleteEtablissement);

/**
 * GET /api/etablissements/:id/sante
 * Indicateurs santé globaux (vaccins à jour, allergies, PAI, traitements en cours)
 */
router.get(
  '/:id/sante',
  authenticate,
  authorize(UserRole.rsai, UserRole.superadmin, UserRole.developpeur),
  etablissementController.getSanteIndicateurs
);

/**
 * POST /api/etablissements/:id/avis-rsai
 * Une RSAI affectée peut noter un établissement de 1 à 5
 */
router.post(
  '/:id/avis-rsai',
  authenticate,
  authorize(UserRole.rsai),
  etablissementController.createAvisRsai
);

export default router;
