import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Middleware d'authentification
 * Vérifie le JWT dans le header Authorization
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    const payload = verifyAccessToken(token);

    // Ajouter les infos utilisateur à la requête
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré',
    });
  }
};

/**
 * Middleware de vérification des rôles
 * Vérifie que l'utilisateur a l'un des rôles autorisés
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est un super admin
 */
export const requireSuperAdmin = authorize(UserRole.superadmin);

/**
 * Middleware pour vérifier si l'utilisateur est un développeur
 */
export const requireDeveloper = authorize(UserRole.developpeur);

/**
 * Middleware pour vérifier si l'utilisateur est admin, super admin ou développeur
 */
export const requireAdmin = authorize(
  UserRole.superadmin,
  UserRole.developpeur,
  UserRole.creche
);

/**
 * Middleware pour vérifier si l'utilisateur est un professionnel
 */
export const requireProfessional = authorize(
  UserRole.superadmin,
  UserRole.developpeur,
  UserRole.creche,
  UserRole.auxiliaire
);

/**
 * Middleware pour la gestion des utilisateurs
 * Réservé aux super admins et développeurs uniquement
 */
export const requireUserManagement = authorize(
  UserRole.superadmin,
  UserRole.developpeur
);
