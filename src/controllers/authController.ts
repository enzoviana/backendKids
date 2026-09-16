import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { AuthRequest, LoginDto, RegisterDto, ChangePasswordDto } from '../types';

/**
 * Contrôleur d'authentification
 */
export class AuthController {
  /**
   * POST /api/auth/login
   * Connexion d'un utilisateur
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginDto = req.body;
      const result = await authService.login(data);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Connexion réussie',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register
   * Inscription d'un nouvel utilisateur
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterDto = req.body;
      const result = await authService.register(data);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Inscription réussie',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Rafraîchissement du token d'accès
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token manquant',
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Déconnexion d'un utilisateur
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token manquant',
        });
        return;
      }

      const result = await authService.logout(refreshToken);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   * Changement de mot de passe
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Non authentifié',
        });
        return;
      }

      const data: ChangePasswordDto = req.body;
      const result = await authService.changePassword(req.user.userId, data);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Récupérer les informations de l'utilisateur connecté
   */
  async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Non authentifié',
        });
        return;
      }

      // Récupérer les infos complètes de l'utilisateur
      const user = await userService.getUserProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
