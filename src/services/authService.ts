import { UserRole } from '@prisma/client';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { LoginDto, RegisterDto, ChangePasswordDto, JWTPayload } from '../types';
import { ApiError } from '../middleware/errorHandler';

/**
 * Service d'authentification
 */
export class AuthService {
  /**
   * Connexion d'un utilisateur
   */
  async login(data: LoginDto) {
    const { email, password } = data;

    // Rechercher l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new ApiError(401, 'Email ou mot de passe incorrect');
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      throw new ApiError(403, 'Compte désactivé. Contactez l\'administrateur.');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Email ou mot de passe incorrect');
    }

    // Créer le payload JWT
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Générer les tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Calculer la date d'expiration du refresh token (7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Stocker le refresh token en base de données
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    // Mettre à jour la date de dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        mustChangePassword: user.mustChangePassword,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Inscription d'un nouvel utilisateur (parent)
   */
  async register(data: RegisterDto) {
    const { email, password, prenom, nom, tel, role } = data;

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, 'Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur avec son profil
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || UserRole.parent,
        profile: {
          create: {
            prenom,
            nom,
            tel,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Créer le payload JWT
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Générer les tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Calculer la date d'expiration du refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Stocker le refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Rafraîchissement du token d'accès
   */
  async refreshToken(refreshToken: string) {
    // Vérifier si le refresh token existe en base de données
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { profile: true } } },
    });

    if (!session) {
      throw new ApiError(401, 'Refresh token invalide');
    }

    // Vérifier si le token n'est pas expiré
    if (session.expiresAt < new Date()) {
      // Supprimer la session expirée
      await prisma.session.delete({ where: { id: session.id } });
      throw new ApiError(401, 'Refresh token expiré');
    }

    // Créer un nouveau payload
    const payload: JWTPayload = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    // Générer un nouveau access token
    const accessToken = generateAccessToken(payload);

    return {
      accessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        profile: session.user.profile,
      },
    };
  }

  /**
   * Déconnexion (suppression du refresh token)
   */
  async logout(refreshToken: string) {
    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    return { message: 'Déconnexion réussie' };
  }

  /**
   * Changement de mot de passe
   */
  async changePassword(userId: string, data: ChangePasswordDto) {
    const { currentPassword, newPassword } = data;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Mot de passe actuel incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false, // Réinitialiser le flag
      },
    });

    // Supprimer toutes les sessions actives (forcer reconnexion)
    await prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Mot de passe changé avec succès' };
  }
}

export const authService = new AuthService();
