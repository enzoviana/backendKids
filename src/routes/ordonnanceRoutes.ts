import { Router } from 'express';
import { ordonnanceController } from '../controllers/ordonnanceController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/ordonnances
 * Créer une nouvelle ordonnance
 */
router.post('/', ordonnanceController.createOrdonnance);

/**
 * GET /api/ordonnances/enfant/:enfantId
 * Récupérer les ordonnances d'un enfant
 * Query params: ?actives=true pour filtrer les ordonnances actives
 */
router.get('/enfant/:enfantId', ordonnanceController.getOrdonnancesByEnfant);

/**
 * GET /api/ordonnances/medecin/:medecinId
 * Récupérer les ordonnances d'un médecin
 */
router.get('/medecin/:medecinId', ordonnanceController.getOrdonnancesByMedecin);

/**
 * GET /api/ordonnances/stats
 * Récupérer les statistiques des ordonnances
 * Query params: ?medecinId=xxx pour filtrer par médecin
 */
router.get('/stats', ordonnanceController.getOrdonnanceStats);

/**
 * GET /api/ordonnances/:id
 * Récupérer une ordonnance par ID
 */
router.get('/:id', ordonnanceController.getOrdonnanceById);

/**
 * PUT /api/ordonnances/:id
 * Mettre à jour une ordonnance
 */
router.put('/:id', ordonnanceController.updateOrdonnance);

/**
 * DELETE /api/ordonnances/:id
 * Supprimer une ordonnance
 */
router.delete('/:id', ordonnanceController.deleteOrdonnance);

export default router;
