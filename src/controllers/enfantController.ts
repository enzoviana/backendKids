import { Response, NextFunction } from 'express';
import { enfantService } from '../services/enfantService';
import { AuthRequest } from '../types';

/**
 * Contrôleur de gestion des enfants
 */
export class EnfantController {
  /**
   * POST /api/enfants
   * Créer un nouvel enfant
   */
  async createEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId, ...data } = req.body;
      const enfant = await enfantService.createEnfant(data, etablissementId);

      res.status(201).json({
        success: true,
        data: enfant,
        message: 'Enfant créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants
   * Récupérer tous les enfants (SuperAdmin uniquement)
   */
  async getAllEnfants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      // Vérifier que l'utilisateur est SuperAdmin
      if (req.user.role !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Accès réservé aux SuperAdmin' });
        return;
      }

      const enfants = await enfantService.getAllEnfants();

      res.status(200).json({
        success: true,
        data: enfants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/etablissement/:etablissementId
   * Récupérer les enfants d'un établissement
   */
  async getEnfants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId } = req.params;
      const enfants = await enfantService.getEnfantsByEtablissement(
        etablissementId,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: enfants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/:id
   * Récupérer un enfant par ID
   */
  async getEnfantById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.getEnfantById(id, req.user.userId, req.user.role);

      res.status(200).json({
        success: true,
        data: enfant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/enfants/:id
   * Mettre à jour un enfant
   */
  async updateEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.updateEnfant(id, req.body);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Enfant mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/regenerer-code
   * Régénérer le code confidentiel
   */
  async regenererCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.regenererCode(id, req.user.userId, req.user.role);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Code confidentiel régénéré avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/lier-parent
   * Lier un parent à un enfant via le code
   */
  async lierParent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { code } = req.body;
      const enfant = await enfantService.lierParent(code, req.user.userId);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Enfant lié avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/enfants/:id
   * Supprimer un enfant
   */
  async deleteEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const result = await enfantService.deleteEnfant(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const enfantController = new EnfantController();
