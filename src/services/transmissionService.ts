import prisma from '../config/prisma';
import type { TypeTransmission, DestinataireTransmission } from '@prisma/client';

interface CreateTransmissionData {
  enfantId: string;
  etablissementId: string;
  type: TypeTransmission;
  contenu: string;
  auteurId: string;
  auteurNom: string;
  destinataire: DestinataireTransmission;
}

interface TransmissionFilters {
  etablissementId: string;
  enfantId?: string;
  type?: TypeTransmission;
  destinataire?: DestinataireTransmission;
  dateDebut?: Date;
  dateFin?: Date;
}

export const transmissionService = {
  /**
   * Créer une nouvelle transmission
   */
  async createTransmission(data: CreateTransmissionData) {
    const transmission = await prisma.transmission.create({
      data: {
        enfantId: data.enfantId,
        etablissementId: data.etablissementId,
        type: data.type,
        contenu: data.contenu,
        auteurId: data.auteurId,
        auteurNom: data.auteurNom,
        destinataire: data.destinataire,
      },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            dateNaissance: true,
            photo: true,
          },
        },
      },
    });

    return transmission;
  },

  /**
   * Récupérer les transmissions avec filtres
   */
  async getTransmissions(filters: TransmissionFilters) {
    const where: any = {
      etablissementId: filters.etablissementId,
    };

    if (filters.enfantId) {
      where.enfantId = filters.enfantId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.destinataire) {
      where.destinataire = filters.destinataire;
    }

    if (filters.dateDebut || filters.dateFin) {
      where.createdAt = {};
      if (filters.dateDebut) {
        where.createdAt.gte = filters.dateDebut;
      }
      if (filters.dateFin) {
        where.createdAt.lte = filters.dateFin;
      }
    }

    const transmissions = await prisma.transmission.findMany({
      where,
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            dateNaissance: true,
            photo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transmissions;
  },

  /**
   * Récupérer les transmissions du jour
   */
  async getTransmissionsToday(etablissementId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getTransmissions({
      etablissementId,
      dateDebut: today,
      dateFin: tomorrow,
    });
  },

  /**
   * Récupérer les transmissions par enfant
   */
  async getTransmissionsByEnfant(enfantId: string) {
    const transmissions = await prisma.transmission.findMany({
      where: { enfantId },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            dateNaissance: true,
            photo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transmissions;
  },

  /**
   * Récupérer une transmission par ID
   */
  async getTransmissionById(id: string) {
    const transmission = await prisma.transmission.findUnique({
      where: { id },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            dateNaissance: true,
            photo: true,
          },
        },
      },
    });

    return transmission;
  },

  /**
   * Supprimer une transmission
   */
  async deleteTransmission(id: string) {
    await prisma.transmission.delete({
      where: { id },
    });
  },

  /**
   * Obtenir les statistiques des transmissions
   */
  async getTransmissionStats(etablissementId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Transmissions du jour
    const transmissionsToday = await prisma.transmission.findMany({
      where: {
        etablissementId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Compter par type
    const stats = {
      total: transmissionsToday.length,
      repas: transmissionsToday.filter((t) => t.type === 'repas').length,
      sieste: transmissionsToday.filter((t) => t.type === 'sieste').length,
      soin: transmissionsToday.filter((t) => t.type === 'soin').length,
      incident: transmissionsToday.filter((t) => t.type === 'incident').length,
      observation: transmissionsToday.filter((t) => t.type === 'observation').length,
    };

    return stats;
  },
};
