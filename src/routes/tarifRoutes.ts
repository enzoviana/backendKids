import { Router } from 'express';
import { tarifController } from '../controllers/tarifController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/tarifs/actifs
 * Récupérer tous les tarifs actifs (accessible sans authentification)
 */
router.get('/actifs', tarifController.getTarifsActifs);

/**
 * GET /api/tarifs/plan/:plan
 * Récupérer un tarif par plan (accessible sans authentification)
 */
router.get('/plan/:plan', tarifController.getTarifByPlan);

/**
 * Toutes les routes suivantes nécessitent une authentification admin
 */
router.use(authenticate);
router.use(requireAdmin);

/**
 * POST /api/tarifs
 * Créer un nouveau tarif (admin seulement)
 */
router.post('/', tarifController.createTarif);

/**
 * GET /api/tarifs
 * Récupérer tous les tarifs (admin seulement)
 */
router.get('/', tarifController.getAllTarifs);

/**
 * PUT /api/tarifs/:id
 * Mettre à jour un tarif (admin seulement)
 */
router.put('/:id', tarifController.updateTarif);

/**
 * PATCH /api/tarifs/:id/desactiver
 * Désactiver un tarif (admin seulement)
 */
router.patch('/:id/desactiver', tarifController.desactiverTarif);

/**
 * DELETE /api/tarifs/:id
 * Supprimer un tarif (admin seulement)
 */
router.delete('/:id', tarifController.deleteTarif);

export default router;
