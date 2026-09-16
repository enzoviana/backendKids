import { Request, Response, NextFunction } from 'express';
import { documentObligatoireService } from '../services/documentObligatoireService';

/**
 * Contrôleur pour la gestion des documents obligatoires personnalisés
 */
export const documentObligatoireController = {
  /**
   * Créer un document obligatoire personnalisé
   */
  async createDocumentObligatoire(req: Request, res: Response, next: NextFunction) {
    try {
      const { etablissementId, nom, description, typeDocument } = req.body;

      if (!etablissementId || !nom || !typeDocument) {
        return res.status(400).json({
          success: false,
          error: 'Champs obligatoires manquants (etablissementId, nom, typeDocument)',
        });
      }

      const documentObligatoire = await documentObligatoireService.createDocumentObligatoire({
        etablissementId,
        nom,
        description,
        typeDocument,
      });

      res.status(201).json({
        success: true,
        data: documentObligatoire,
        message: 'Document obligatoire créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Récupérer tous les documents obligatoires d'un établissement
   */
  async getDocumentsObligatoiresByEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { etablissementId } = req.params;

      const documentsObligatoires =
        await documentObligatoireService.getDocumentsObligatoiresByEtablissement(etablissementId);

      res.status(200).json({
        success: true,
        data: documentsObligatoires,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mettre à jour un document obligatoire
   */
  async updateDocumentObligatoire(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const documentObligatoire = await documentObligatoireService.updateDocumentObligatoire(
        id,
        updateData
      );

      res.status(200).json({
        success: true,
        data: documentObligatoire,
        message: 'Document obligatoire mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Supprimer un document obligatoire
   */
  async deleteDocumentObligatoire(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await documentObligatoireService.deleteDocumentObligatoire(id);

      res.status(200).json({
        success: true,
        message: 'Document obligatoire supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Désactiver un document obligatoire
   */
  async deactivateDocumentObligatoire(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const documentObligatoire =
        await documentObligatoireService.deactivateDocumentObligatoire(id);

      res.status(200).json({
        success: true,
        data: documentObligatoire,
        message: 'Document obligatoire désactivé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },
};
