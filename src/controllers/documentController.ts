import { Response, NextFunction } from 'express';
import { documentService } from '../services/documentService';
import { AuthRequest } from '../types';

/**
 * Contrôleur de gestion des documents
 */
export class DocumentController {
  /**
   * POST /api/documents/demander
   * Demander un document à un parent
   */
  async demanderDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const data = {
        ...req.body,
        auteurId: req.user.userId,
        auteurRole: req.user.role,
      };

      const document = await documentService.demanderDocument(data);

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document demandé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/:id/upload
   * Uploader un document
   */
  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const { nom, fichierUrl } = req.body;

      const document = await documentService.uploadDocument({
        documentId: id,
        nom,
        fichierUrl,
        userId: req.user.userId,
      });

      res.status(200).json({
        success: true,
        data: document,
        message: 'Document uploadé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/:id/valider
   * Valider un document
   */
  async validerDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const { dateExpiration } = req.body;

      const document = await documentService.validerDocument({
        documentId: id,
        auteurId: req.user.userId,
        auteurRole: req.user.role,
        dateExpiration,
      });

      res.status(200).json({
        success: true,
        data: document,
        message: 'Document validé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/:id/rejeter
   * Rejeter un document
   */
  async rejeterDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const { commentaire } = req.body;

      if (!commentaire) {
        res.status(400).json({
          success: false,
          error: 'Le commentaire est obligatoire pour rejeter un document',
        });
        return;
      }

      const document = await documentService.rejeterDocument({
        documentId: id,
        commentaire,
        auteurId: req.user.userId,
        auteurRole: req.user.role,
      });

      res.status(200).json({
        success: true,
        data: document,
        message: 'Document rejeté',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/:id/relancer
   * Relancer pour un document
   */
  async relancerDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;

      const result = await documentService.relancerDocument({
        documentId: id,
        auteurId: req.user.userId,
        auteurRole: req.user.role,
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/enfant/:enfantId
   * Récupérer les documents d'un enfant
   */
  async getDocumentsByEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { enfantId } = req.params;
      const documents = await documentService.getDocumentsByEnfant(enfantId);

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/etablissement/:etablissementId
   * Récupérer les documents d'un établissement
   */
  async getDocumentsByEtablissement(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId } = req.params;
      const documents = await documentService.getDocumentsByEtablissement(etablissementId);

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/documents/upload-direct
   * Upload direct d'un document avec fichier
   */
  async uploadDirectDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
        return;
      }

      const { enfantId, type, nom, dateExpiration } = req.body;

      if (!enfantId || !type || !nom) {
        res.status(400).json({
          success: false,
          error: 'enfantId, type et nom sont requis',
        });
        return;
      }

      // Construire l'URL du fichier
      const fichierUrl = `/uploads/documents/${req.file.filename}`;

      const document = await documentService.uploadDirectDocument({
        enfantId,
        type,
        nom,
        fichierUrl,
        userId: req.user.userId,
        userRole: req.user.role,
        dateExpiration: dateExpiration || undefined,
      });

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploadé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
