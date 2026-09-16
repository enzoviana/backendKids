import prisma from '../config/prisma';
import { UpdateProfileDto } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';
import { UserRole } from '@prisma/client';

/**
 * Service de gestion des utilisateurs et profils
 */
export class UserService {
  /**
   * Récupérer le profil complet d'un utilisateur
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        etablissements: {
          include: {
            etablissement: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    // Ne pas retourner le mot de passe
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Mettre à jour le profil d'un utilisateur
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    // Mettre à jour le profil
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        prenom: data.prenom,
        nom: data.nom,
        tel: data.tel,
        adresse: data.adresse,
        codePostal: data.codePostal,
        ville: data.ville,
        photo: data.photo,
        langue: data.langue,
        timezone: data.timezone,
      },
    });

    return updatedProfile;
  }

  /**
   * Mettre à jour le profil d'un autre utilisateur (admin uniquement)
   */
  async updateUserProfile(userId: string, data: UpdateProfileDto) {
    return this.updateProfile(userId, data);
  }

  /**
   * Récupérer tous les utilisateurs (admin seulement)
   */
  async getAllUsers(role?: string) {
    const where = role ? { role: role as any } : {};

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
      },
    });

    // Exclure les mots de passe des résultats
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Activer/Désactiver un utilisateur (admin seulement)
   */
  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: { profile: true },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Supprimer un utilisateur (admin seulement)
   */
  async deleteUser(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Utilisateur supprimé avec succès' };
  }

  /**
   * Créer un nouvel utilisateur (admin seulement)
   */
  async createUser(data: {
    email: string;
    password: string;
    prenom: string;
    nom: string;
    tel?: string;
    role: UserRole;
    mustChangePassword?: boolean;
  }) {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(data.password);

    // Créer l'utilisateur avec son profil
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role,
        mustChangePassword: data.mustChangePassword ?? true,
        profile: {
          create: {
            prenom: data.prenom,
            nom: data.nom,
            tel: data.tel,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const userService = new UserService();
