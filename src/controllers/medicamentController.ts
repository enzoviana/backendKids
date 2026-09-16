import { Request, Response } from 'express';
import { medicamentService } from '../services/medicamentService';

export const medicamentController = {
  /**
   * POST /api/medicaments - Créer un nouveau médicament
   */
  async createMedicament(req: Request, res: Response) {
    try {
      const medicament = await medicamentService.createMedicament(req.body);

      res.status(201).json({
        success: true,
        data: medicament,
        message: 'Médicament créé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur création médicament:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la création du médicament',
      });
    }
  },

  /**
   * GET /api/medicaments/etablissement/:etablissementId - Récupérer les médicaments d'un établissement
   */
  async getMedicamentsByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;
      const actifsUniquement = req.query.actifs !== 'false';

      const medicaments = await medicamentService.getMedicamentsByEtablissement(
        etablissementId,
        actifsUniquement
      );

      res.json({
        success: true,
        data: medicaments,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération médicaments:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des médicaments',
      });
    }
  },

  /**
   * GET /api/medicaments/enfant/:enfantId - Récupérer les médicaments d'un enfant
   */
  async getMedicamentsByEnfant(req: Request, res: Response) {
    try {
      const { enfantId } = req.params;
      const actifsUniquement = req.query.actifs !== 'false';

      const medicaments = await medicamentService.getMedicamentsByEnfant(enfantId, actifsUniquement);

      res.json({
        success: true,
        data: medicaments,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération médicaments enfant:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des médicaments',
      });
    }
  },

  /**
   * GET /api/medicaments/:id - Récupérer un médicament par ID
   */
  async getMedicamentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const medicament = await medicamentService.getMedicamentById(id);

      res.json({
        success: true,
        data: medicament,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération médicament:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Médicament non trouvé',
      });
    }
  },

  /**
   * PUT /api/medicaments/:id - Mettre à jour un médicament
   */
  async updateMedicament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const medicament = await medicamentService.updateMedicament(id, req.body);

      res.json({
        success: true,
        data: medicament,
        message: 'Médicament mis à jour avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur mise à jour médicament:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du médicament',
      });
    }
  },

  /**
   * PATCH /api/medicaments/:id/deactivate - Désactiver un médicament
   */
  async deactivateMedicament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const medicament = await medicamentService.deactivateMedicament(id);

      res.json({
        success: true,
        data: medicament,
        message: 'Médicament désactivé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur désactivation médicament:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la désactivation du médicament',
      });
    }
  },

  /**
   * DELETE /api/medicaments/:id - Supprimer un médicament
   */
  async deleteMedicament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await medicamentService.deleteMedicament(id);

      res.json({
        success: true,
        message: 'Médicament supprimé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression médicament:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la suppression du médicament',
      });
    }
  },

  /**
   * POST /api/medicaments/:id/administrations - Enregistrer une administration
   */
  async createAdministration(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const administration = await medicamentService.createAdministration({
        ...req.body,
        medicamentId: id,
      });

      res.status(201).json({
        success: true,
        data: administration,
        message: 'Administration enregistrée avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur enregistrement administration:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de l\'administration',
      });
    }
  },

  /**
   * GET /api/medicaments/:id/administrations - Récupérer l'historique d'administration
   */
  async getAdministrationsByMedicament(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const administrations = await medicamentService.getAdministrationsByMedicament(id);

      res.json({
        success: true,
        data: administrations,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération administrations:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des administrations',
      });
    }
  },

  /**
   * GET /api/medicaments/today/:etablissementId - Récupérer les administrations du jour
   */
  async getAdministrationsToday(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const medicaments = await medicamentService.getAdministrationsToday(etablissementId);

      res.json({
        success: true,
        data: medicaments,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération administrations du jour:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des administrations',
      });
    }
  },

  /**
   * GET /api/medicaments/stats/:etablissementId - Obtenir les statistiques
   */
  async getMedicamentStats(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const stats = await medicamentService.getMedicamentStats(etablissementId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération stats médicaments:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques',
      });
    }
  },
};
