import { Router } from 'express';
import { transmissionController } from '../controllers/transmissionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/transmissions
 * Créer une nouvelle transmission
 */
router.post('/', transmissionController.createTransmission);

/**
 * GET /api/transmissions/etablissement/:etablissementId
 * Récupérer les transmissions d'un établissement
 */
router.get('/etablissement/:etablissementId', transmissionController.getTransmissionsByEtablissement);

/**
 * GET /api/transmissions/today/:etablissementId
 * Récupérer les transmissions du jour
 */
router.get('/today/:etablissementId', transmissionController.getTransmissionsToday);

/**
 * GET /api/transmissions/stats/:etablissementId
 * Obtenir les statistiques des transmissions
 */
router.get('/stats/:etablissementId', transmissionController.getTransmissionStats);

/**
 * GET /api/transmissions/enfant/:enfantId
 * Récupérer les transmissions d'un enfant
 */
router.get('/enfant/:enfantId', transmissionController.getTransmissionsByEnfant);

/**
 * GET /api/transmissions/:id
 * Récupérer une transmission par ID
 */
router.get('/:id', transmissionController.getTransmissionById);

/**
 * DELETE /api/transmissions/:id
 * Supprimer une transmission
 */
router.delete('/:id', transmissionController.deleteTransmission);

export default router;
