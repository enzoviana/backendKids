import { Router } from 'express';
import { sectionController } from '../controllers/sectionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/sections
 * Créer une nouvelle section
 */
router.post('/', sectionController.createSection);

/**
 * GET /api/sections/etablissement/:etablissementId
 * Récupérer les sections d'un établissement
 */
router.get('/etablissement/:etablissementId', sectionController.getSectionsByEtablissement);

/**
 * GET /api/sections/stats/:etablissementId
 * Obtenir les statistiques des sections
 */
router.get('/stats/:etablissementId', sectionController.getSectionStats);

/**
 * GET /api/sections/:id
 * Récupérer une section par ID
 */
router.get('/:id', sectionController.getSectionById);

/**
 * PUT /api/sections/:id
 * Mettre à jour une section
 */
router.put('/:id', sectionController.updateSection);

/**
 * DELETE /api/sections/:id
 * Supprimer une section
 */
router.delete('/:id', sectionController.deleteSection);

export default router;
