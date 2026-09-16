import { PrismaClient, TypeMedicament, VoieAdministration, StatutAdministration } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateMedicamentData {
  enfantId: string;
  etablissementId: string;
  nomMedicament: string;
  typeMedicament: TypeMedicament;
  dosage: string;
  voieAdministration: VoieAdministration;
  frequence: string;
  dateDebut: string;
  dateFin?: string;
  prescripteur?: string;
  numerOrdonnance?: string;
  indication?: string;
  ordonnanceUrl?: string;
  createdBy: string;
}

interface CreateAdministrationData {
  medicamentId: string;
  enfantId: string;
  dateHeure: string;
  statut: StatutAdministration;
  administrePar: string;
  administreParNom: string;
  commentaire?: string;
}

export const medicamentService = {
  /**
   * Créer un nouveau médicament/traitement
   */
  async createMedicament(data: CreateMedicamentData) {
    const medicament = await prisma.medicament.create({
      data: {
        enfantId: data.enfantId,
        etablissementId: data.etablissementId,
        nomMedicament: data.nomMedicament,
        typeMedicament: data.typeMedicament,
        dosage: data.dosage,
        voieAdministration: data.voieAdministration,
        frequence: data.frequence,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        prescripteur: data.prescripteur,
        numerOrdonnance: data.numerOrdonnance,
        indication: data.indication,
        ordonnanceUrl: data.ordonnanceUrl,
        createdBy: data.createdBy,
        isActif: true,
      },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
          },
        },
      },
    });

    console.log('✅ Médicament créé:', medicament.id);
    return medicament;
  },

  /**
   * Récupérer tous les médicaments d'un établissement
   */
  async getMedicamentsByEtablissement(etablissementId: string, actifsUniquement = true) {
    const where: any = { etablissementId };

    if (actifsUniquement) {
      where.isActif = true;
    }

    const medicaments = await prisma.medicament.findMany({
      where,
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
            section: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
        administrations: {
          orderBy: {
            dateHeure: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        dateDebut: 'desc',
      },
    });

    return medicaments;
  },

  /**
   * Récupérer les médicaments d'un enfant
   */
  async getMedicamentsByEnfant(enfantId: string, actifsUniquement = true) {
    const where: any = { enfantId };

    if (actifsUniquement) {
      where.isActif = true;
    }

    const medicaments = await prisma.medicament.findMany({
      where,
      include: {
        administrations: {
          orderBy: {
            dateHeure: 'desc',
          },
        },
      },
      orderBy: {
        dateDebut: 'desc',
      },
    });

    return medicaments;
  },

  /**
   * Récupérer un médicament par ID
   */
  async getMedicamentById(medicamentId: string) {
    const medicament = await prisma.medicament.findUnique({
      where: { id: medicamentId },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
          },
        },
        administrations: {
          orderBy: {
            dateHeure: 'desc',
          },
        },
      },
    });

    if (!medicament) {
      throw new Error('Médicament non trouvé');
    }

    return medicament;
  },

  /**
   * Mettre à jour un médicament
   */
  async updateMedicament(medicamentId: string, data: Partial<CreateMedicamentData>) {
    const updateData: any = { ...data };

    if (data.dateDebut) {
      updateData.dateDebut = new Date(data.dateDebut);
    }
    if (data.dateFin) {
      updateData.dateFin = new Date(data.dateFin);
    }

    const medicament = await prisma.medicament.update({
      where: { id: medicamentId },
      data: updateData,
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
          },
        },
      },
    });

    console.log('✅ Médicament mis à jour:', medicament.id);
    return medicament;
  },

  /**
   * Désactiver un médicament (fin de traitement)
   */
  async deactivateMedicament(medicamentId: string) {
    const medicament = await prisma.medicament.update({
      where: { id: medicamentId },
      data: {
        isActif: false,
        dateFin: new Date(),
      },
    });

    console.log('✅ Médicament désactivé:', medicament.id);
    return medicament;
  },

  /**
   * Supprimer un médicament
   */
  async deleteMedicament(medicamentId: string) {
    await prisma.medicament.delete({
      where: { id: medicamentId },
    });

    console.log('✅ Médicament supprimé:', medicamentId);
    return { message: 'Médicament supprimé avec succès' };
  },

  /**
   * Enregistrer une administration de médicament
   */
  async createAdministration(data: CreateAdministrationData) {
    const administration = await prisma.administrationMedicament.create({
      data: {
        medicamentId: data.medicamentId,
        enfantId: data.enfantId,
        dateHeure: new Date(data.dateHeure),
        statut: data.statut,
        administrePar: data.administrePar,
        administreParNom: data.administreParNom,
        commentaire: data.commentaire,
      },
      include: {
        medicament: {
          select: {
            id: true,
            nomMedicament: true,
            dosage: true,
          },
        },
      },
    });

    console.log('✅ Administration enregistrée:', administration.id);
    return administration;
  },

  /**
   * Récupérer l'historique d'administration d'un médicament
   */
  async getAdministrationsByMedicament(medicamentId: string) {
    const administrations = await prisma.administrationMedicament.findMany({
      where: { medicamentId },
      orderBy: {
        dateHeure: 'desc',
      },
    });

    return administrations;
  },

  /**
   * Récupérer les administrations du jour pour un établissement
   */
  async getAdministrationsToday(etablissementId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const medicaments = await prisma.medicament.findMany({
      where: {
        etablissementId,
        isActif: true,
        dateDebut: {
          lte: today,
        },
        OR: [
          { dateFin: null },
          { dateFin: { gte: today } },
        ],
      },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
            section: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
        administrations: {
          where: {
            dateHeure: {
              gte: today,
              lt: tomorrow,
            },
          },
        },
      },
    });

    return medicaments;
  },

  /**
   * Obtenir les statistiques des médicaments
   */
  async getMedicamentStats(etablissementId: string) {
    const total = await prisma.medicament.count({
      where: {
        etablissementId,
        isActif: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const administrationsToday = await prisma.administrationMedicament.count({
      where: {
        medicament: {
          etablissementId,
        },
        dateHeure: {
          gte: today,
        },
      },
    });

    const adminFaites = await prisma.administrationMedicament.count({
      where: {
        medicament: {
          etablissementId,
        },
        dateHeure: {
          gte: today,
        },
        statut: 'fait',
      },
    });

    return {
      total,
      administrationsToday,
      adminFaites,
      tauxReussite: administrationsToday > 0 ? Math.round((adminFaites / administrationsToday) * 100) : 100,
    };
  },
};
