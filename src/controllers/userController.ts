import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { emailService } from '../services/emailService';
import { AuthRequest, UpdateProfileDto } from '../types';
import prisma from '../config/prisma';

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
   * PATCH /api/users/:userId/repair
   * Réparer un compte (activer + désactiver mustChangePassword)
   */
  async repairAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          mustChangePassword: false,
        },
        include: { profile: true },
      });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Compte réparé avec succès (activé + connexion directe autorisée)',
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
      console.log('📝 Création d\'utilisateur - Body reçu:', JSON.stringify(req.body, null, 2));

      const { email, password, prenom, nom, tel, telephone, role, mustChangePassword } = req.body;

      // Support à la fois 'tel' et 'telephone'
      const phoneNumber = tel || telephone;

      console.log(`👤 Création utilisateur: ${prenom} ${nom} (${email}) - Rôle: ${role}`);

      const user = await userService.createUser({
        email,
        password,
        prenom,
        nom,
        tel: phoneNumber,
        role,
        mustChangePassword,
      });

      console.log('✅ Utilisateur créé:', user.id);

      // Si un mot de passe temporaire a été généré, envoyer un email
      if ((user as any).temporaryPassword) {
        const tempPassword = (user as any).temporaryPassword;

        console.log('🔑 Mot de passe temporaire généré:', tempPassword);
        console.log('📧 Tentative d\'envoi d\'email à:', email);

        // Envoyer l'email avec les identifiants (async, ne pas attendre)
        emailService.sendAccountCreated(email, {
          prenom,
          nom,
          email,
          temporaryPassword: tempPassword,
          role,
        }).then(() => {
          console.log('✅ Email envoyé avec succès à:', email);
        }).catch(err => {
          console.error('❌ Erreur lors de l\'envoi de l\'email de création de compte:', err);
        });

        // Retourner l'utilisateur avec le mot de passe temporaire pour que le dev puisse le voir
        res.status(201).json({
          success: true,
          data: user,
          message: 'Utilisateur créé avec succès. Un email a été envoyé avec le mot de passe temporaire.',
        });
      } else {
        console.log('ℹ️ Mot de passe fourni par l\'utilisateur, pas d\'email envoyé');
        res.status(201).json({
          success: true,
          data: user,
          message: 'Utilisateur créé avec succès',
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création d\'utilisateur:', error);
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

  /**
   * GET /api/users/export-data
   * Export RGPD de mes données
   */
  async exportMyData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/me/avatar
   * Upload de l'avatar
   */
  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { avatarUrl: '/uploads/avatar.jpg' } });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
