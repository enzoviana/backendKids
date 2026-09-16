import prisma from '../config/prisma';
import { ApiError } from '../middleware/errorHandler';

/**
 * Génère un code confidentiel unique à 6 caractères
 */
const generateCodeConfidentiel = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Service de gestion des enfants
 */
export class EnfantService {
  /**
   * Créer un nouvel enfant avec code confidentiel unique
   */
  async createEnfant(data: any, etablissementId: string) {
    // Générer un code unique
    let codeConfidentiel = generateCodeConfidentiel();
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.enfant.findUnique({
        where: { codeConfidentiel },
      });

      if (!existing) {
        isUnique = true;
      } else {
        codeConfidentiel = generateCodeConfidentiel();
      }
    }

    const enfant = await prisma.enfant.create({
      data: {
        ...data,
        etablissementId,
        codeConfidentiel,
        codeGenereLe: new Date(),
      },
      include: {
        section: true,
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    return enfant;
  }

  /**
   * Récupérer tous les enfants de la plateforme (SuperAdmin uniquement)
   */
  async getAllEnfants() {
    const enfants = await prisma.enfant.findMany({
      include: {
        section: true,
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    return enfants;
  }

  /**
   * Récupérer tous les enfants d'un établissement
   */
  async getEnfantsByEtablissement(etablissementId: string, userId: string, userRole: string) {
    // Si parent, ne montrer que ses enfants
    if (userRole === 'parent') {
      const enfants = await prisma.enfant.findMany({
        where: {
          etablissementId,
          parents: {
            some: {
              id: userId,
            },
          },
        },
        include: {
          section: true,
          parents: {
            include: {
              profile: true,
            },
          },
        },
      });
      return enfants;
    }

    // Sinon, montrer tous les enfants de l'établissement
    const enfants = await prisma.enfant.findMany({
      where: { etablissementId },
      include: {
        section: true,
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    return enfants;
  }

  /**
   * Récupérer un enfant par ID
   */
  async getEnfantById(enfantId: string, userId: string, userRole: string) {
    const enfant = await prisma.enfant.findUnique({
      where: { id: enfantId },
      include: {
        section: true,
        etablissement: true,
        parents: {
          include: {
            profile: true,
          },
        },
        documents: {
          include: {
            actions: true,
          },
        },
      },
    });

    if (!enfant) {
      throw new ApiError(404, 'Enfant non trouvé');
    }

    // Vérifier les permissions (parent ne peut voir que ses enfants)
    if (userRole === 'parent') {
      const isParent = enfant.parents.some((p) => p.id === userId);
      if (!isParent) {
        throw new ApiError(403, 'Accès non autorisé');
      }
    }

    return enfant;
  }

  /**
   * Mettre à jour un enfant
   */
  async updateEnfant(enfantId: string, data: any) {
    const enfant = await prisma.enfant.update({
      where: { id: enfantId },
      data,
      include: {
        section: true,
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    return enfant;
  }

  /**
   * Régénérer le code confidentiel d'un enfant
   */
  async regenererCode(enfantId: string, auteurId: string, auteurRole: string) {
    let codeConfidentiel = generateCodeConfidentiel();
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.enfant.findUnique({
        where: { codeConfidentiel },
      });

      if (!existing) {
        isUnique = true;
      } else {
        codeConfidentiel = generateCodeConfidentiel();
      }
    }

    // Mettre à jour le code
    const enfant = await prisma.enfant.update({
      where: { id: enfantId },
      data: {
        codeConfidentiel,
        codeGenereLe: new Date(),
      },
    });

    // Logger l'action
    await prisma.actionDocument.create({
      data: {
        enfantId,
        type: 'regeneration_code',
        auteurId,
        auteurRole: auteurRole as any,
        commentaire: 'Code confidentiel régénéré',
      },
    });

    return enfant;
  }

  /**
   * Lier un parent à un enfant via le code confidentiel
   */
  async lierParent(code: string, parentId: string) {
    // Chercher l'enfant avec ce code
    const enfant = await prisma.enfant.findUnique({
      where: { codeConfidentiel: code },
      include: {
        parents: true,
      },
    });

    if (!enfant) {
      throw new ApiError(404, 'Code invalide');
    }

    // Vérifier si déjà lié
    const alreadyLinked = enfant.parents.some((p) => p.id === parentId);
    if (alreadyLinked) {
      throw new ApiError(409, 'Vous êtes déjà lié à cet enfant');
    }

    // Lier le parent (relation many-to-many)
    await prisma.enfant.update({
      where: { id: enfant.id },
      data: {
        parents: {
          connect: { id: parentId },
        },
      },
    });

    // Retourner l'enfant mis à jour
    const updatedEnfant = await prisma.enfant.findUnique({
      where: { id: enfant.id },
      include: {
        section: true,
        etablissement: true,
        parents: {
          include: {
            profile: true,
          },
        },
      },
    });

    return updatedEnfant;
  }

  /**
   * Supprimer un enfant
   */
  async deleteEnfant(enfantId: string) {
    await prisma.enfant.delete({
      where: { id: enfantId },
    });

    return { message: 'Enfant supprimé avec succès' };
  }
}

export const enfantService = new EnfantService();
