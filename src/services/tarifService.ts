import prisma from '../config/prisma';

interface CreateTarifData {
  plan: string;
  nom: string;
  description?: string;
  prixMensuel: number;
  prixAnnuel: number;
  fonctionnalites: any;
  limites: any;
}

export const tarifService = {
  /**
   * Créer un nouveau tarif
   */
  async createTarif(data: CreateTarifData) {
    const tarif = await prisma.tarif.create({
      data: {
        plan: data.plan,
        nom: data.nom,
        description: data.description,
        prixMensuel: data.prixMensuel,
        prixAnnuel: data.prixAnnuel,
        fonctionnalites: data.fonctionnalites,
        limites: data.limites,
      },
    });

    return tarif;
  },

  /**
   * Récupérer tous les tarifs actifs
   */
  async getTarifsActifs() {
    const tarifs = await prisma.tarif.findMany({
      where: { isActive: true },
      orderBy: { prixMensuel: 'asc' },
    });

    return tarifs;
  },

  /**
   * Récupérer tous les tarifs
   */
  async getAllTarifs() {
    const tarifs = await prisma.tarif.findMany({
      orderBy: { prixMensuel: 'asc' },
    });

    return tarifs;
  },

  /**
   * Récupérer un tarif par plan
   */
  async getTarifByPlan(plan: string) {
    const tarif = await prisma.tarif.findUnique({
      where: { plan },
    });

    return tarif;
  },

  /**
   * Mettre à jour un tarif
   */
  async updateTarif(id: string, data: any) {
    const tarif = await prisma.tarif.update({
      where: { id },
      data,
    });

    return tarif;
  },

  /**
   * Désactiver un tarif
   */
  async desactiverTarif(id: string) {
    await prisma.tarif.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * Supprimer un tarif
   */
  async deleteTarif(id: string) {
    await prisma.tarif.delete({
      where: { id },
    });
  },
};
