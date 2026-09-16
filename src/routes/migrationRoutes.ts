import { Router } from 'express';
import { migrationController } from '../controllers/migrationController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/admin/migrate
 * Appliquer les migrations de la base de données (SuperAdmin uniquement)
 */
router.post('/migrate', migrationController.applyMigrations);

/**
 * GET /api/admin/migrate/status
 * Vérifier l'état des migrations (SuperAdmin uniquement)
 */
router.get('/migrate/status', migrationController.getMigrationStatus);

export default router;
