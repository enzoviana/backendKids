import { Router } from 'express';
import { parentController } from '../controllers/parentController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification en tant que parent
 */
router.use(authenticate);
router.use(authorize(UserRole.parent));

/**
 * GET /api/parents/me/enfants
 * Enfants rattachés au parent connecté, avec le résumé du jour
 */
router.get('/me/enfants', parentController.getMyEnfants);

/**
 * GET /api/parents/me/transmissions
 * Transmissions du jour pour les enfants du parent
 * Query params: ?date=YYYY-MM-DD
 */
router.get('/me/transmissions', parentController.getMyTransmissions);

/**
 * GET /api/parents/me/alertes
 * Alertes santé envoyées au parent
 */
router.get('/me/alertes', parentController.getMyAlertes);

export default router;
