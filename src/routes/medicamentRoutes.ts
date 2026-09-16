import { Router } from 'express';
import { medicamentController } from '../controllers/medicamentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/medicaments
 * Créer un nouveau médicament/traitement
 */
router.post('/', medicamentController.createMedicament);

/**
 * GET /api/medicaments/etablissement/:etablissementId
 * Récupérer les médicaments d'un établissement
 */
router.get('/etablissement/:etablissementId', medicamentController.getMedicamentsByEtablissement);

/**
 * GET /api/medicaments/enfant/:enfantId
 * Récupérer les médicaments d'un enfant
 */
router.get('/enfant/:enfantId', medicamentController.getMedicamentsByEnfant);

/**
 * GET /api/medicaments/today/:etablissementId
 * Récupérer les administrations du jour pour un établissement
 */
router.get('/today/:etablissementId', medicamentController.getAdministrationsToday);

/**
 * GET /api/medicaments/stats/:etablissementId
 * Obtenir les statistiques des médicaments
 */
router.get('/stats/:etablissementId', medicamentController.getMedicamentStats);

/**
 * GET /api/medicaments/:id
 * Récupérer un médicament par ID
 */
router.get('/:id', medicamentController.getMedicamentById);

/**
 * PUT /api/medicaments/:id
 * Mettre à jour un médicament
 */
router.put('/:id', medicamentController.updateMedicament);

/**
 * PATCH /api/medicaments/:id/deactivate
 * Désactiver un médicament (fin de traitement)
 */
router.patch('/:id/deactivate', medicamentController.deactivateMedicament);

/**
 * DELETE /api/medicaments/:id
 * Supprimer un médicament
 */
router.delete('/:id', medicamentController.deleteMedicament);

/**
 * POST /api/medicaments/:id/administrations
 * Enregistrer une administration de médicament
 */
router.post('/:id/administrations', medicamentController.createAdministration);

/**
 * GET /api/medicaments/:id/administrations
 * Récupérer l'historique d'administration d'un médicament
 */
router.get('/:id/administrations', medicamentController.getAdministrationsByMedicament);

export default router;
