import prisma from '../config/prisma';

interface CreateDiagnosticData {
  enfantId: string;
  auteurId: string;
  auteurNom: string;
  symptomes: any;
  temperature?: number;
  observations?: string;
}

export const diagnosticService = {
  /**
   * Créer un nouveau diagnostic IA
   */
  async createDiagnostic(data: CreateDiagnosticData) {
    // Simuler l'analyse IA (à remplacer par une vraie API IA)
    const resultatIA = this.analyserSymptomes(data.symptomes, data.temperature);

    const diagnostic = await prisma.diagnosticIA.create({
      data: {
        enfantId: data.enfantId,
        auteurId: data.auteurId,
        auteurNom: data.auteurNom,
        symptomes: data.symptomes,
        temperature: data.temperature,
        observations: data.observations,
        resultatIA,
        probabilites: resultatIA.probabilites,
        recommandations: resultatIA.recommandations,
        urgence: resultatIA.urgence,
        consulterMedecin: resultatIA.consulterMedecin,
      },
    });

    return diagnostic;
  },

  /**
   * Analyser les symptômes (simulation IA)
   */
  analyserSymptomes(symptomes: any, temperature?: number) {
    const hasTemperature = temperature && temperature >= 38;
    const symptomeList = Array.isArray(symptomes) ? symptomes : [symptomes];

    let urgence = 'normal';
    let consulterMedecin = false;
    let diagnosticPrincipal = 'État grippal léger';
    let probabilites: any = {};
    let recommandations: any = [];

    // Logique simple de diagnostic
    if (hasTemperature && temperature! >= 39.5) {
      urgence = 'urgent';
      consulterMedecin = true;
      diagnosticPrincipal = 'Fièvre élevée - Consultation urgente';
      recommandations.push('Consulter un médecin immédiatement');
      recommandations.push('Surveiller la température toutes les heures');
    } else if (hasTemperature) {
      urgence = 'surveiller';
      consulterMedecin = symptomeList.length > 2;
      diagnosticPrincipal = 'État fébrile modéré';
      recommandations.push('Surveiller la température régulièrement');
      recommandations.push('Hydrater régulièrement l\'enfant');
      recommandations.push('Paracétamol si nécessaire (selon ordonnance)');
    }

    if (symptomeList.includes('toux') && symptomeList.includes('difficultés_respiratoires')) {
      urgence = 'urgent';
      consulterMedecin = true;
      diagnosticPrincipal = 'Détresse respiratoire possible';
    }

    probabilites = {
      [diagnosticPrincipal]: 0.85,
      'Infection virale': 0.65,
      'Infection bactérienne': 0.25,
    };

    return {
      diagnostic: diagnosticPrincipal,
      probabilites,
      recommandations,
      urgence,
      consulterMedecin,
    };
  },

  /**
   * Récupérer les diagnostics d'un enfant
   */
  async getDiagnosticsByEnfant(enfantId: string) {
    const diagnostics = await prisma.diagnosticIA.findMany({
      where: { enfantId },
      orderBy: { createdAt: 'desc' },
    });

    return diagnostics;
  },

  /**
   * Récupérer un diagnostic par ID
   */
  async getDiagnosticById(id: string) {
    const diagnostic = await prisma.diagnosticIA.findUnique({
      where: { id },
    });

    return diagnostic;
  },

  /**
   * Supprimer un diagnostic
   */
  async deleteDiagnostic(id: string) {
    await prisma.diagnosticIA.delete({
      where: { id },
    });
  },

  /**
   * Obtenir les statistiques des diagnostics
   */
  async getDiagnosticStats() {
    const total = await prisma.diagnosticIA.count();
    const urgents = await prisma.diagnosticIA.count({ where: { urgence: 'urgent' } });
    const aSurveiller = await prisma.diagnosticIA.count({ where: { urgence: 'surveiller' } });
    const normaux = await prisma.diagnosticIA.count({ where: { urgence: 'normal' } });

    return {
      total,
      urgents,
      aSurveiller,
      normaux,
      tauxConsultation: total > 0 ? Math.round((urgents / total) * 100) : 0,
    };
  },
};
