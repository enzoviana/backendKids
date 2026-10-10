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
   * Génère un mot de passe temporaire sécurisé
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Au moins une majuscule
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    // Au moins une minuscule
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    // Au moins un chiffre
    password += '0123456789'[Math.floor(Math.random() * 10)];
    // Au moins un caractère spécial
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Compléter jusqu'à 12 caractères
    for (let i = 0; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

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
    password?: string;
    prenom: string;
    nom: string;
    tel?: string;
    role: UserRole;
    mustChangePassword?: boolean;
  }) {
    console.log('🔍 UserService.createUser - Données reçues:', {
      email: data.email,
      prenom: data.prenom,
      nom: data.nom,
      role: data.role,
      passwordProvided: !!data.password,
    });

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'Cet email est déjà utilisé');
    }

    // Générer un mot de passe temporaire si non fourni
    const wasPasswordProvided = !!data.password;
    const tempPassword = data.password || this.generateTempPassword();

    console.log('🔑 Mot de passe:', wasPasswordProvided ? 'Fourni par l\'utilisateur' : `Généré: ${tempPassword}`);

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(tempPassword);

    console.log('🔒 Mot de passe hashé avec succès');

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

    // Retourner l'utilisateur avec le mot de passe temporaire si généré
    const result = {
      ...userWithoutPassword,
      ...(wasPasswordProvided ? {} : { temporaryPassword: tempPassword }),
    };

    console.log('✅ UserService.createUser - Utilisateur créé:', {
      id: result.id,
      email: result.email,
      hasTemporaryPassword: !wasPasswordProvided,
      temporaryPasswordIncluded: 'temporaryPassword' in result,
    });

    return result;
  }
}

export const userService = new UserService();
