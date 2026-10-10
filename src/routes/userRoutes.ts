import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, requireAdmin, requireUserManagement } from '../middleware/auth';
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
 * Routes de gestion des utilisateurs (superadmin + développeur uniquement)
 */

/**
 * GET /api/users
 * Récupérer tous les utilisateurs (superadmin/développeur seulement)
 */
router.get('/', requireUserManagement, userController.getAllUsers.bind(userController));

/**
 * POST /api/users
 * Créer un nouvel utilisateur (superadmin/développeur seulement)
 */
router.post('/', requireUserManagement, userController.createUser.bind(userController));

/**
 * PUT /api/users/:userId/profile
 * Mettre à jour le profil d'un autre utilisateur (superadmin/développeur seulement)
 */
router.put(
  '/:userId/profile',
  requireUserManagement,
  updateProfileValidation,
  validateRequest,
  userController.updateUserProfile.bind(userController)
);

/**
 * PATCH /api/users/:userId/status
 * Activer/Désactiver un utilisateur (superadmin/développeur seulement)
 */
router.patch(
  '/:userId/status',
  requireUserManagement,
  userController.toggleUserStatus.bind(userController)
);

/**
 * PATCH /api/users/:userId/repair
 * Réparer un compte (activer + autoriser connexion directe)
 */
router.patch(
  '/:userId/repair',
  requireUserManagement,
  userController.repairAccount.bind(userController)
);

/**
 * DELETE /api/users/:userId
 * Supprimer un utilisateur (superadmin/développeur seulement)
 */
router.delete(
  '/:userId',
  requireUserManagement,
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
