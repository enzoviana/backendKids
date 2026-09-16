import prisma from '../config/prisma';

interface CreateOrdonnanceData {
  enfantId: string;
  medecinId: string;
  medecinNom: string;
  dateOrdonnance: Date;
  dateExpiration?: Date;
  diagnostic: string;
  prescriptions: any;
  recommandations?: string;
  fichierUrl?: string;
}

export const ordonnanceService = {
  /**
   * Créer une nouvelle ordonnance
   */
  async createOrdonnance(data: CreateOrdonnanceData) {
    // Générer un numéro d'ordonnance unique
    const numero = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const ordonnance = await prisma.ordonnance.create({
      data: {
        enfantId: data.enfantId,
        medecinId: data.medecinId,
        medecinNom: data.medecinNom,
        dateOrdonnance: data.dateOrdonnance,
        dateExpiration: data.dateExpiration,
        diagnostic: data.diagnostic,
        prescriptions: data.prescriptions,
        recommandations: data.recommandations,
        fichierUrl: data.fichierUrl,
        numeroOrdonnance: numero,
      },
    });

    return ordonnance;
  },

  /**
   * Récupérer les ordonnances d'un enfant
   */
  async getOrdonnancesByEnfant(enfantId: string, actives = false) {
    const where: any = { enfantId };
    if (actives) {
      where.statut = 'active';
    }

    const ordonnances = await prisma.ordonnance.findMany({
      where,
      orderBy: { dateOrdonnance: 'desc' },
    });

    return ordonnances;
  },

  /**
   * Récupérer les ordonnances d'un médecin
   */
  async getOrdonnancesByMedecin(medecinId: string) {
    const ordonnances = await prisma.ordonnance.findMany({
      where: { medecinId },
      orderBy: { dateOrdonnance: 'desc' },
    });

    return ordonnances;
  },

  /**
   * Récupérer une ordonnance par ID
   */
  async getOrdonnanceById(id: string) {
    const ordonnance = await prisma.ordonnance.findUnique({
      where: { id },
    });

    return ordonnance;
  },

  /**
   * Mettre à jour une ordonnance
   */
  async updateOrdonnance(id: string, data: any) {
    const ordonnance = await prisma.ordonnance.update({
      where: { id },
      data,
    });

    return ordonnance;
  },

  /**
   * Supprimer une ordonnance
   */
  async deleteOrdonnance(id: string) {
    await prisma.ordonnance.delete({
      where: { id },
    });
  },

  /**
   * Obtenir les statistiques des ordonnances
   */
  async getOrdonnanceStats(medecinId?: string) {
    const where: any = {};
    if (medecinId) {
      where.medecinId = medecinId;
    }

    const total = await prisma.ordonnance.count({ where });
    const actives = await prisma.ordonnance.count({ where: { ...where, statut: 'active' } });
    const expirees = await prisma.ordonnance.count({ where: { ...where, statut: 'expiree' } });

    return {
      total,
      actives,
      expirees,
      annulees: total - actives - expirees,
    };
  },
};
