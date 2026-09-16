import { PrismaClient, Etablissement } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

/**
 * Service de gestion des établissements
 */
export const etablissementService = {
  /**
   * Récupérer un établissement par ID
   */
  async getEtablissementById(id: string): Promise<Etablissement> {
    const etablissement = await prisma.etablissement.findUnique({
      where: { id },
      include: {
        sections: true,
        enfants: {
          where: { isActive: true },
        },
        personnels: {
          where: { isActive: true },
        },
      },
    });

    if (!etablissement) {
      throw new ApiError(404, 'Établissement non trouvé');
    }

    return etablissement;
  },

  /**
   * Récupérer tous les établissements
   */
  async getAllEtablissements(filters?: { isActive?: boolean; ville?: string }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.ville) {
      where.ville = { contains: filters.ville, mode: 'insensitive' };
    }

    const etablissements = await prisma.etablissement.findMany({
      where,
      include: {
        _count: {
          select: {
            enfants: true,
            personnels: true,
            sections: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    return etablissements;
  },

  /**
   * Créer un nouvel établissement
   */
  async createEtablissement(data: {
    nom: string;
    type: string;
    adresse: string;
    codePostal: string;
    ville: string;
    telephone?: string;
    email?: string;
    numeroAgrement?: string;
    capaciteAccueil: number;
    horaires?: any;
  }): Promise<Etablissement> {
    // Vérifier si un établissement avec le même nom existe déjà
    const existing = await prisma.etablissement.findFirst({
      where: {
        nom: data.nom,
        ville: data.ville,
      },
    });

    if (existing) {
      throw new ApiError(409, 'Un établissement avec ce nom existe déjà dans cette ville');
    }

    const etablissement = await prisma.etablissement.create({
      data: {
        nom: data.nom,
        type: data.type,
        adresse: data.adresse,
        codePostal: data.codePostal,
        ville: data.ville,
        telephone: data.telephone,
        email: data.email,
        numeroAgrement: data.numeroAgrement,
        capaciteAccueil: data.capaciteAccueil,
        horaires: data.horaires || null,
        isActive: true,
      },
    });

    return etablissement;
  },

  /**
   * Mettre à jour un établissement
   */
  async updateEtablissement(
    id: string,
    data: {
      nom?: string;
      type?: string;
      adresse?: string;
      codePostal?: string;
      ville?: string;
      telephone?: string;
      email?: string;
      numeroAgrement?: string;
      capaciteAccueil?: number;
      horaires?: any;
      isActive?: boolean;
    }
  ): Promise<Etablissement> {
    // Vérifier que l'établissement existe
    const existing = await prisma.etablissement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError(404, 'Établissement non trouvé');
    }

    // Mettre à jour
    const etablissement = await prisma.etablissement.update({
      where: { id },
      data: {
        ...(data.nom && { nom: data.nom }),
        ...(data.type && { type: data.type }),
        ...(data.adresse && { adresse: data.adresse }),
        ...(data.codePostal && { codePostal: data.codePostal }),
        ...(data.ville && { ville: data.ville }),
        ...(data.telephone !== undefined && { telephone: data.telephone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.numeroAgrement !== undefined && { numeroAgrement: data.numeroAgrement }),
        ...(data.capaciteAccueil !== undefined && { capaciteAccueil: data.capaciteAccueil }),
        ...(data.horaires !== undefined && { horaires: data.horaires }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return etablissement;
  },

  /**
   * Désactiver un établissement
   */
  async deactivateEtablissement(id: string): Promise<Etablissement> {
    const etablissement = await prisma.etablissement.update({
      where: { id },
      data: { isActive: false },
    });

    return etablissement;
  },

  /**
   * Supprimer un établissement
   */
  async deleteEtablissement(id: string): Promise<void> {
    // Vérifier que l'établissement existe
    const existing = await prisma.etablissement.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
    });

    if (!existing) {
      throw new ApiError(404, 'Établissement non trouvé');
    }

    // Empêcher la suppression si des enfants ou personnels sont rattachés
    if (existing._count.enfants > 0 || existing._count.personnels > 0) {
      throw new ApiError(
        400,
        'Impossible de supprimer un établissement avec des enfants ou personnels rattachés'
      );
    }

    await prisma.etablissement.delete({
      where: { id },
    });
  },

  /**
   * Récupérer les statistiques d'un établissement
   */
  async getEtablissementStats(id: string) {
    const etablissement = await prisma.etablissement.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            enfants: {
              where: { isActive: true },
            },
          },
        },
        enfants: {
          where: { isActive: true },
        },
        personnels: {
          where: { isActive: true },
        },
      },
    });

    if (!etablissement) {
      throw new ApiError(404, 'Établissement non trouvé');
    }

    // Calculer les statistiques
    const totalEnfants = etablissement.enfants.length;
    const totalPersonnels = etablissement.personnels.length;
    const totalSections = etablissement.sections.length;
    const capaciteAccueil = etablissement.capaciteAccueil;
    const tauxOccupation = capaciteAccueil > 0 ? Math.round((totalEnfants / capaciteAccueil) * 100) : 0;

    // Statistiques par section
    const statsSections = etablissement.sections.map((section) => ({
      id: section.id,
      nom: section.nom,
      effectif: section.enfants.length,
      capacite: section.capacite,
      tauxOccupation: section.capacite > 0 ? Math.round((section.enfants.length / section.capacite) * 100) : 0,
    }));

    return {
      totalEnfants,
      totalPersonnels,
      totalSections,
      capaciteAccueil,
      tauxOccupation,
      statsSections,
    };
  },
};
