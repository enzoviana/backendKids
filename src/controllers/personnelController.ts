import { Request, Response } from 'express';
import { personnelService } from '../services/personnelService';

export const personnelController = {
  /**
   * POST /api/personnels - Créer un nouveau membre du personnel
   */
  async createPersonnel(req: Request, res: Response) {
    try {
      const personnel = await personnelService.createPersonnel(req.body);

      res.status(201).json({
        success: true,
        data: personnel,
        message: 'Personnel créé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur création personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la création du personnel',
      });
    }
  },

  /**
   * GET /api/personnels/etablissement/:etablissementId - Récupérer le personnel d'un établissement
   */
  async getPersonnelByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const personnels = await personnelService.getPersonnelByEtablissement(etablissementId);

      res.json({
        success: true,
        data: personnels,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération du personnel',
      });
    }
  },

  /**
   * GET /api/personnels/:id - Récupérer un membre du personnel par ID
   */
  async getPersonnelById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const personnel = await personnelService.getPersonnelById(id);

      res.json({
        success: true,
        data: personnel,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération personnel:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Personnel non trouvé',
      });
    }
  },

  /**
   * PUT /api/personnels/:id - Mettre à jour un membre du personnel
   */
  async updatePersonnel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const personnel = await personnelService.updatePersonnel(id, req.body);

      res.json({
        success: true,
        data: personnel,
        message: 'Personnel mis à jour avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur mise à jour personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du personnel',
      });
    }
  },

  /**
   * PATCH /api/personnels/:id/deactivate - Désactiver un membre du personnel
   */
  async deactivatePersonnel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const personnel = await personnelService.deactivatePersonnel(id);

      res.json({
        success: true,
        data: personnel,
        message: 'Personnel désactivé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur désactivation personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la désactivation du personnel',
      });
    }
  },

  /**
   * DELETE /api/personnels/:id - Supprimer un membre du personnel
   */
  async deletePersonnel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await personnelService.deletePersonnel(id);

      res.json({
        success: true,
        message: 'Personnel supprimé avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la suppression du personnel',
      });
    }
  },

  /**
   * GET /api/personnels/stats/:etablissementId - Obtenir les statistiques du personnel
   */
  async getPersonnelStats(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const stats = await personnelService.getPersonnelStats(etablissementId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération stats personnel:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques',
      });
    }
  },
};
