import { Request, Response, NextFunction } from 'express';
import { etablissementService } from '../services/etablissementService';

/**
 * Contrôleur pour la gestion des établissements
 */
export const etablissementController = {
  /**
   * Récupérer un établissement par ID
   */
  async getEtablissementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const etablissement = await etablissementService.getEtablissementById(id);

      res.status(200).json({
        success: true,
        data: etablissement,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Récupérer tous les établissements
   */
  async getAllEtablissements(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, ville } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (ville) {
        filters.ville = ville as string;
      }

      const etablissements = await etablissementService.getAllEtablissements(filters);

      res.status(200).json({
        success: true,
        data: etablissements,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Créer un nouvel établissement
   */
  async createEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        nom,
        type,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        numeroAgrement,
        capaciteAccueil,
        horaires,
      } = req.body;

      // Validation
      if (!nom || !type || !adresse || !codePostal || !ville || !capaciteAccueil) {
        return res.status(400).json({
          success: false,
          error: 'Champs obligatoires manquants',
        });
      }

      const etablissement = await etablissementService.createEtablissement({
        nom,
        type,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        numeroAgrement,
        capaciteAccueil: Number(capaciteAccueil),
        horaires,
      });

      res.status(201).json({
        success: true,
        data: etablissement,
        message: 'Établissement créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mettre à jour un établissement
   */
  async updateEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const etablissement = await etablissementService.updateEtablissement(id, updateData);

      res.status(200).json({
        success: true,
        data: etablissement,
        message: 'Établissement mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Désactiver un établissement
   */
  async deactivateEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const etablissement = await etablissementService.deactivateEtablissement(id);

      res.status(200).json({
        success: true,
        data: etablissement,
        message: 'Établissement désactivé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Supprimer un établissement
   */
  async deleteEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await etablissementService.deleteEtablissement(id);

      res.status(200).json({
        success: true,
        message: 'Établissement supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Récupérer les statistiques d'un établissement
   */
  async getEtablissementStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const stats = await etablissementService.getEtablissementStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },
};
