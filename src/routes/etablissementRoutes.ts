import { Router } from 'express';
import { etablissementController } from '../controllers/etablissementController';
import { authenticate, requireAdmin } from '../middleware/auth';

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

export default router;
