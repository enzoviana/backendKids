import { Router } from 'express';
import { rgpdController } from '../controllers/rgpdController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/rgpd/demandes
 * Demande d'exercice des droits RGPD
 */
router.post('/demandes', rgpdController.createDemande);

/**
 * GET /api/rgpd/demandes
 * Liste des demandes RGPD (admin)
 */
router.get('/demandes', requireAdmin, rgpdController.getAllDemandes);

/**
 * GET /api/rgpd/registre
 * Registre des traitements + preuves pour un contrôle CNIL
 * Query params: ?du=YYYY-MM-DD&au=YYYY-MM-DD
 */
router.get('/registre', requireAdmin, rgpdController.getRegistre);

/**
 * GET /api/rgpd/export
 * Export complet (CSV/JSON/PDF) des journaux d'accès, consentements et demandes RGPD
 * Query params: ?type=logs|consentements|demandes|tout&format=csv|json|pdf&du=&au=
 */
router.get('/export', requireAdmin, rgpdController.exportData);

export default router;
