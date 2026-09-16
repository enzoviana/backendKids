import prisma from '../config/prisma';

interface CreateAbonnementData {
  etablissementId: string;
  plan: string;
  dateDebut: Date;
  dateFin?: Date;
  prixMensuel: number;
  fonctionnalites: any;
  limites: any;
}

export const abonnementService = {
  /**
   * Créer un nouvel abonnement
   */
  async createAbonnement(data: CreateAbonnementData) {
    const abonnement = await prisma.abonnement.create({
      data: {
        etablissementId: data.etablissementId,
        plan: data.plan,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        prixMensuel: data.prixMensuel,
        fonctionnalites: data.fonctionnalites,
        limites: data.limites,
        statut: 'active',
      },
    });

    return abonnement;
  },

  /**
   * Récupérer l'abonnement d'un établissement
   */
  async getAbonnementByEtablissement(etablissementId: string) {
    const abonnement = await prisma.abonnement.findFirst({
      where: { etablissementId, statut: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    return abonnement;
  },

  /**
   * Récupérer tous les abonnements
   */
  async getAllAbonnements() {
    const abonnements = await prisma.abonnement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return abonnements;
  },

  /**
   * Mettre à jour un abonnement
   */
  async updateAbonnement(id: string, data: any) {
    const abonnement = await prisma.abonnement.update({
      where: { id },
      data,
    });

    return abonnement;
  },

  /**
   * Suspendre un abonnement
   */
  async suspendreAbonnement(id: string) {
    await prisma.abonnement.update({
      where: { id },
      data: { statut: 'suspendu' },
    });
  },

  /**
   * Réactiver un abonnement
   */
  async reactiverAbonnement(id: string) {
    await prisma.abonnement.update({
      where: { id },
      data: { statut: 'active' },
    });
  },

  /**
   * Obtenir les statistiques des abonnements
   */
  async getAbonnementStats() {
    const total = await prisma.abonnement.count();
    const actifs = await prisma.abonnement.count({ where: { statut: 'active' } });
    const suspendus = await prisma.abonnement.count({ where: { statut: 'suspendu' } });
    const expires = await prisma.abonnement.count({ where: { statut: 'expire' } });

    const revenuMensuel = await prisma.abonnement.aggregate({
      where: { statut: 'active' },
      _sum: { prixMensuel: true },
    });

    return {
      total,
      actifs,
      suspendus,
      expires,
      revenuMensuel: revenuMensuel._sum.prixMensuel || 0,
    };
  },
};
