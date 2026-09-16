import type { Request, Response } from 'express';
import { sectionService } from '../services/sectionService';

export const sectionController = {
  /**
   * POST /api/sections
   * Créer une nouvelle section
   */
  async createSection(req: Request, res: Response) {
    try {
      const { etablissementId, nom, trancheAge, capacite, couleur } = req.body;

      if (!etablissementId || !nom || !trancheAge || !capacite) {
        return res.status(400).json({
          success: false,
          error: 'Tous les champs requis doivent être fournis',
        });
      }

      const section = await sectionService.createSection({
        etablissementId,
        nom,
        trancheAge,
        capacite: parseInt(capacite),
        couleur,
      });

      res.status(201).json({
        success: true,
        message: 'Section créée avec succès',
        data: section,
      });
    } catch (error: any) {
      console.error('❌ Erreur création section:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la création de la section',
      });
    }
  },

  /**
   * GET /api/sections/etablissement/:etablissementId
   * Récupérer les sections d'un établissement
   */
  async getSectionsByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const sections = await sectionService.getSectionsByEtablissement(etablissementId);

      res.status(200).json({
        success: true,
        data: sections,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération sections:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des sections',
      });
    }
  },

  /**
   * GET /api/sections/stats/:etablissementId
   * Obtenir les statistiques des sections
   */
  async getSectionStats(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const stats = await sectionService.getSectionStats(etablissementId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération stats sections:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques',
      });
    }
  },

  /**
   * GET /api/sections/:id
   * Récupérer une section par ID
   */
  async getSectionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const section = await sectionService.getSectionById(id);

      if (!section) {
        return res.status(404).json({
          success: false,
          error: 'Section non trouvée',
        });
      }

      res.status(200).json({
        success: true,
        data: section,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération section:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération de la section',
      });
    }
  },

  /**
   * PUT /api/sections/:id
   * Mettre à jour une section
   */
  async updateSection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nom, trancheAge, capacite, couleur } = req.body;

      const updateData: any = {};
      if (nom) updateData.nom = nom;
      if (trancheAge) updateData.trancheAge = trancheAge;
      if (capacite) updateData.capacite = parseInt(capacite);
      if (couleur !== undefined) updateData.couleur = couleur;

      const section = await sectionService.updateSection(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Section mise à jour avec succès',
        data: section,
      });
    } catch (error: any) {
      console.error('❌ Erreur mise à jour section:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la mise à jour de la section',
      });
    }
  },

  /**
   * DELETE /api/sections/:id
   * Supprimer une section
   */
  async deleteSection(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await sectionService.deleteSection(id);

      res.status(200).json({
        success: true,
        message: 'Section supprimée avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression section:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la suppression de la section',
      });
    }
  },
};
