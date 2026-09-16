import { Router } from 'express';
import { personnelController } from '../controllers/personnelController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/personnels
 * Créer un nouveau membre du personnel
 */
router.post('/', personnelController.createPersonnel);

/**
 * GET /api/personnels/etablissement/:etablissementId
 * Récupérer le personnel d'un établissement
 */
router.get('/etablissement/:etablissementId', personnelController.getPersonnelByEtablissement);

/**
 * GET /api/personnels/stats/:etablissementId
 * Obtenir les statistiques du personnel d'un établissement
 */
router.get('/stats/:etablissementId', personnelController.getPersonnelStats);

/**
 * GET /api/personnels/:id
 * Récupérer un membre du personnel par ID
 */
router.get('/:id', personnelController.getPersonnelById);

/**
 * PUT /api/personnels/:id
 * Mettre à jour un membre du personnel
 */
router.put('/:id', personnelController.updatePersonnel);

/**
 * PATCH /api/personnels/:id/deactivate
 * Désactiver un membre du personnel
 */
router.patch('/:id/deactivate', personnelController.deactivatePersonnel);

/**
 * DELETE /api/personnels/:id
 * Supprimer un membre du personnel
 */
router.delete('/:id', personnelController.deletePersonnel);

export default router;
