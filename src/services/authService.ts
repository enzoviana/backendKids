import { UserRole } from '@prisma/client';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { LoginDto, RegisterDto, ChangePasswordDto, JWTPayload } from '../types';
import { ApiError } from '../middleware/errorHandler';
import crypto from 'crypto';
import { emailService } from './emailService';

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
   * Inscription d'un nouvel utilisateur (UNIQUEMENT PARENTS)
   * ⚠️ Les autres rôles (crèche, RSAI, admin) doivent être invités par l'admin
   */
  async register(data: RegisterDto) {
    const { email, password, prenom, nom, tel, role } = data;

    // ⚠️ SÉCURITÉ: L'inscription publique est UNIQUEMENT pour les parents
    // Les autres rôles (crèche, RSAI, admin) doivent être invités par l'admin
    if (role && role !== UserRole.parent) {
      throw new ApiError(403, 'L\'inscription publique est réservée aux parents. Les autres rôles doivent être invités par un administrateur.');
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, 'Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur avec son profil (TOUJOURS en tant que parent)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: UserRole.parent, // Forcé à "parent" uniquement
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

  /**
   * Demander la réinitialisation du mot de passe
   */
  async forgotPassword(email: string) {
    // Rechercher l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Ne pas révéler si l'utilisateur existe ou non (sécurité)
    if (!user) {
      return;
    }

    // Générer un token aléatoire sécurisé
    const token = crypto.randomBytes(32).toString('hex');

    // Définir l'expiration à 1 heure
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Supprimer les anciens tokens non utilisés de cet utilisateur
    await prisma.passwordReset.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // Créer le token de réinitialisation
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Récupérer le profil pour le prénom
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // Envoyer l'email de réinitialisation
    await emailService.sendPasswordReset(email, {
      prenom: profile?.prenom || 'Utilisateur',
      token,
      expiration: '1 heure',
    });

    return;
  }

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async resetPassword(token: string, newPassword: string) {
    // Rechercher le token de réinitialisation
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new ApiError(400, 'Token invalide ou expiré');
    }

    // Vérifier si le token n'est pas expiré
    if (resetToken.expiresAt < new Date()) {
      throw new ApiError(400, 'Token expiré');
    }

    // Vérifier si le token n'a pas déjà été utilisé
    if (resetToken.used) {
      throw new ApiError(400, 'Token déjà utilisé');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Marquer le token comme utilisé
    await prisma.passwordReset.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Supprimer toutes les sessions actives (forcer reconnexion)
    await prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    return;
  }
}

export const authService = new AuthService();
