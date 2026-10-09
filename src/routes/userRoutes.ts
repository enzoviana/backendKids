import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { updateProfileValidation } from '../utils/validators';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * GET /api/users/profile
 * Récupérer le profil de l'utilisateur connecté
 */
router.get('/profile', userController.getProfile.bind(userController));

/**
 * PUT /api/users/profile
 * Mettre à jour le profil de l'utilisateur connecté
 */
router.put(
  '/profile',
  updateProfileValidation,
  validateRequest,
  userController.updateProfile.bind(userController)
);

/**
 * Routes admin uniquement
 */

/**
 * GET /api/users
 * Récupérer tous les utilisateurs (admin seulement)
 */
router.get('/', requireAdmin, userController.getAllUsers.bind(userController));

/**
 * POST /api/users
 * Créer un nouvel utilisateur (admin seulement)
 */
router.post('/', requireAdmin, userController.createUser.bind(userController));

/**
 * PUT /api/users/:userId/profile
 * Mettre à jour le profil d'un autre utilisateur (admin seulement)
 */
router.put(
  '/:userId/profile',
  requireAdmin,
  updateProfileValidation,
  validateRequest,
  userController.updateUserProfile.bind(userController)
);

/**
 * PATCH /api/users/:userId/status
 * Activer/Désactiver un utilisateur (admin seulement)
 */
router.patch(
  '/:userId/status',
  requireAdmin,
  userController.toggleUserStatus.bind(userController)
);

/**
 * DELETE /api/users/:userId
 * Supprimer un utilisateur (admin seulement)
 */
router.delete(
  '/:userId',
  requireAdmin,
  userController.deleteUser.bind(userController)
);

/**
 * GET /api/users/export-data
 * Export RGPD de mes données
 */
router.get('/export-data', userController.exportMyData.bind(userController));

/**
 * POST /api/users/me/avatar
 * Photo de profil (multipart, champ « photo », jpg/png ≤ 2 Mo)
 */
router.post(
  '/me/avatar',
  upload.single('photo'),
  userController.uploadAvatar.bind(userController)
);

export default router;
