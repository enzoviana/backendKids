import prisma from '../config/prisma';

interface CreateSectionData {
  etablissementId: string;
  nom: string;
  trancheAge: string;
  capacite: number;
  couleur?: string;
}

interface UpdateSectionData {
  nom?: string;
  trancheAge?: string;
  capacite?: number;
  couleur?: string;
}

export const sectionService = {
  /**
   * Créer une nouvelle section
   */
  async createSection(data: CreateSectionData) {
    const section = await prisma.section.create({
      data: {
        etablissementId: data.etablissementId,
        nom: data.nom,
        trancheAge: data.trancheAge,
        capacite: data.capacite,
        couleur: data.couleur,
      },
      include: {
        etablissement: true,
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
    });

    return section;
  },

  /**
   * Récupérer toutes les sections d'un établissement
   */
  async getSectionsByEtablissement(etablissementId: string) {
    const sections = await prisma.section.findMany({
      where: { etablissementId },
      include: {
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    return sections;
  },

  /**
   * Récupérer une section par ID
   */
  async getSectionById(id: string) {
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        etablissement: true,
        enfants: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
            dateNaissance: true,
          },
        },
        personnels: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            role: true,
            photo: true,
          },
        },
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
    });

    return section;
  },

  /**
   * Mettre à jour une section
   */
  async updateSection(id: string, data: UpdateSectionData) {
    const section = await prisma.section.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
    });

    return section;
  },

  /**
   * Supprimer une section
   */
  async deleteSection(id: string) {
    await prisma.section.delete({
      where: { id },
    });
  },

  /**
   * Obtenir les statistiques des sections
   */
  async getSectionStats(etablissementId: string) {
    const sections = await prisma.section.findMany({
      where: { etablissementId },
      include: {
        _count: {
          select: {
            enfants: true,
            personnels: true,
          },
        },
      },
    });

    const totalCapacite = sections.reduce((acc, s) => acc + s.capacite, 0);
    const totalEnfants = sections.reduce((acc, s) => acc + s._count.enfants, 0);
    const tauxOccupation = totalCapacite > 0 ? Math.round((totalEnfants / totalCapacite) * 100) : 0;

    return {
      totalSections: sections.length,
      totalCapacite,
      totalEnfants,
      tauxOccupation,
      sections: sections.map((s) => ({
        id: s.id,
        nom: s.nom,
        capacite: s.capacite,
        effectif: s._count.enfants,
        personnels: s._count.personnels,
        tauxOccupation: s.capacite > 0 ? Math.round((s._count.enfants / s.capacite) * 100) : 0,
      })),
    };
  },
};
