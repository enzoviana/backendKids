import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  loginValidation,
  registerValidation,
  changePasswordValidation,
} from '../utils/validators';

const router = Router();

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post(
  '/login',
  loginValidation,
  validateRequest,
  authController.login.bind(authController)
);

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur (parent)
 */
router.post(
  '/register',
  registerValidation,
  validateRequest,
  authController.register.bind(authController)
);

/**
 * POST /api/auth/refresh
 * Rafraîchissement du token d'accès
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * POST /api/auth/logout
 * Déconnexion d'un utilisateur
 */
router.post('/logout', authController.logout.bind(authController));

/**
 * POST /api/auth/change-password
 * Changement de mot de passe (authentifié)
 */
router.post(
  '/change-password',
  authenticate,
  changePasswordValidation,
  validateRequest,
  authController.changePassword.bind(authController)
);

/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;
