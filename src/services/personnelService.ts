import { PrismaClient, TypeContrat, StatutDiplome } from '@prisma/client';

const prisma = new PrismaClient();

interface CreatePersonnelData {
  etablissementId: string;
  sectionId?: string;
  prenom: string;
  nom: string;
  email: string;
  tel?: string;
  role: string;
  diplome: string;
  dateEmbauche: string;
  statutDiplome?: StatutDiplome;
  habilitations?: string[];
  contrat?: TypeContrat;
  photo?: string;
}

interface UpdatePersonnelData {
  sectionId?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  tel?: string;
  role?: string;
  diplome?: string;
  dateEmbauche?: string;
  statutDiplome?: StatutDiplome;
  habilitations?: string[];
  contrat?: TypeContrat;
  photo?: string;
  isActive?: boolean;
}

export const personnelService = {
  /**
   * Créer un nouveau membre du personnel
   */
  async createPersonnel(data: CreatePersonnelData) {
    const personnel = await prisma.personnel.create({
      data: {
        etablissementId: data.etablissementId,
        sectionId: data.sectionId || null,
        prenom: data.prenom,
        nom: data.nom,
        email: data.email,
        tel: data.tel,
        role: data.role,
        diplome: data.diplome,
        dateEmbauche: new Date(data.dateEmbauche),
        statutDiplome: data.statutDiplome || 'valide',
        habilitations: data.habilitations || [],
        contrat: data.contrat || 'CDI',
        photo: data.photo,
        isActive: true,
      },
      include: {
        section: true,
        etablissement: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    console.log('✅ Personnel créé:', personnel.id);
    return personnel;
  },

  /**
   * Récupérer tout le personnel d'un établissement
   */
  async getPersonnelByEtablissement(etablissementId: string) {
    const personnels = await prisma.personnel.findMany({
      where: {
        etablissementId,
        isActive: true,
      },
      include: {
        section: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: {
        nom: 'asc',
      },
    });

    return personnels;
  },

  /**
   * Récupérer un membre du personnel par ID
   */
  async getPersonnelById(personnelId: string) {
    const personnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
      include: {
        section: {
          select: {
            id: true,
            nom: true,
          },
        },
        etablissement: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    if (!personnel) {
      throw new Error('Personnel non trouvé');
    }

    return personnel;
  },

  /**
   * Mettre à jour un membre du personnel
   */
  async updatePersonnel(personnelId: string, data: UpdatePersonnelData) {
    const updateData: any = { ...data };

    // Convertir dateEmbauche si fournie
    if (data.dateEmbauche) {
      updateData.dateEmbauche = new Date(data.dateEmbauche);
    }

    const personnel = await prisma.personnel.update({
      where: { id: personnelId },
      data: updateData,
      include: {
        section: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    console.log('✅ Personnel mis à jour:', personnel.id);
    return personnel;
  },

  /**
   * Désactiver (soft delete) un membre du personnel
   */
  async deactivatePersonnel(personnelId: string) {
    const personnel = await prisma.personnel.update({
      where: { id: personnelId },
      data: { isActive: false },
    });

    console.log('✅ Personnel désactivé:', personnel.id);
    return personnel;
  },

  /**
   * Supprimer définitivement un membre du personnel
   */
  async deletePersonnel(personnelId: string) {
    await prisma.personnel.delete({
      where: { id: personnelId },
    });

    console.log('✅ Personnel supprimé:', personnelId);
    return { message: 'Personnel supprimé avec succès' };
  },

  /**
   * Obtenir les statistiques du personnel
   */
  async getPersonnelStats(etablissementId: string) {
    const total = await prisma.personnel.count({
      where: {
        etablissementId,
        isActive: true,
      },
    });

    const totalCDI = await prisma.personnel.count({
      where: {
        etablissementId,
        isActive: true,
        contrat: 'CDI',
      },
    });

    const aRenouveler = await prisma.personnel.count({
      where: {
        etablissementId,
        isActive: true,
        statutDiplome: {
          in: ['expire_bientot', 'expire'],
        },
      },
    });

    const conformiteRate = total > 0 ? Math.round(((total - aRenouveler) / total) * 100) : 100;

    return {
      total,
      totalCDI,
      aRenouveler,
      conformiteRate,
    };
  },
};
