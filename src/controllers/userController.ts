import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AuthRequest, UpdateProfileDto } from '../types';

/**
 * Contrôleur de gestion des utilisateurs
 */
export class UserController {
  /**
   * GET /api/users/profile
   * Récupérer le profil de l'utilisateur connecté
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Non authentifié',
        });
        return;
      }

      const profile = await userService.getUserProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/profile
   * Mettre à jour le profil de l'utilisateur connecté
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Non authentifié',
        });
        return;
      }

      const data: UpdateProfileDto = req.body;
      const updatedProfile = await userService.updateProfile(req.user.userId, data);

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profil mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users
   * Récupérer tous les utilisateurs (admin seulement)
   */
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.query;
      const users = await userService.getAllUsers(role as string);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:userId/status
   * Activer/Désactiver un utilisateur (admin seulement)
   */
  async toggleUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await userService.toggleUserStatus(userId, isActive);

      res.status(200).json({
        success: true,
        data: user,
        message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/:userId
   * Supprimer un utilisateur (admin seulement)
   */
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await userService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users
   * Créer un nouvel utilisateur (admin seulement)
   */
  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, prenom, nom, tel, role, mustChangePassword } = req.body;

      const user = await userService.createUser({
        email,
        password,
        prenom,
        nom,
        tel,
        role,
        mustChangePassword,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'Utilisateur créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:userId/profile
   * Mettre à jour le profil d'un autre utilisateur (admin seulement)
   */
  async updateUserProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const data: UpdateProfileDto = req.body;

      const updatedProfile = await userService.updateUserProfile(userId, data);

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profil mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
