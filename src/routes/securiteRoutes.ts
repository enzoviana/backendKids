import { Router } from 'express';
import { securiteController } from '../controllers/securiteController';
import { authenticate, requireAdmin, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/securite/regles-acces
 * Plages horaires autorisées par rôle et périmètres de géorepérage par établissement
 */
router.get('/regles-acces', requireAdmin, securiteController.getReglesAcces);

/**
 * PUT /api/securite/regles-acces
 * Enregistrer les plages horaires et périmètres
 */
router.put('/regles-acces', requireAdmin, securiteController.updateReglesAcces);

/**
 * POST /api/securite/verifier-acces
 * Vérifie l'horaire et la position de l'utilisateur avant d'ouvrir un dossier
 */
router.post(
  '/verifier-acces',
  authorize(UserRole.creche, UserRole.rsai),
  securiteController.verifierAcces
);

/**
 * GET /api/securite/alertes
 * Tentatives d'accès hors plage horaire ou hors zone
 */
router.get('/alertes', requireAdmin, securiteController.getAlertes);

export default router;
