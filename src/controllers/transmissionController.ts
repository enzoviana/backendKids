import type { Request, Response } from 'express';
import { transmissionService } from '../services/transmissionService';
import type { TypeTransmission, DestinataireTransmission } from '@prisma/client';

export const transmissionController = {
  /**
   * POST /api/transmissions
   * Créer une nouvelle transmission
   */
  async createTransmission(req: Request, res: Response) {
    try {
      const {
        enfantId,
        etablissementId,
        type,
        contenu,
        auteurId,
        auteurNom,
        destinataire,
      } = req.body;

      // Validation
      if (!enfantId || !etablissementId || !type || !contenu || !auteurId || !auteurNom) {
        return res.status(400).json({
          success: false,
          error: 'Tous les champs requis doivent être fournis',
        });
      }

      const transmission = await transmissionService.createTransmission({
        enfantId,
        etablissementId,
        type: type as TypeTransmission,
        contenu,
        auteurId,
        auteurNom,
        destinataire: (destinataire || 'parent') as DestinataireTransmission,
      });

      res.status(201).json({
        success: true,
        message: 'Transmission créée avec succès',
        data: transmission,
      });
    } catch (error: any) {
      console.error('❌ Erreur création transmission:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la création de la transmission',
      });
    }
  },

  /**
   * GET /api/transmissions/etablissement/:etablissementId
   * Récupérer les transmissions d'un établissement
   */
  async getTransmissionsByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;
      const { type, destinataire, enfantId, dateDebut, dateFin } = req.query;

      const filters: any = { etablissementId };

      if (type) filters.type = type as TypeTransmission;
      if (destinataire) filters.destinataire = destinataire as DestinataireTransmission;
      if (enfantId) filters.enfantId = enfantId as string;
      if (dateDebut) filters.dateDebut = new Date(dateDebut as string);
      if (dateFin) filters.dateFin = new Date(dateFin as string);

      const transmissions = await transmissionService.getTransmissions(filters);

      res.status(200).json({
        success: true,
        data: transmissions,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération transmissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des transmissions',
      });
    }
  },

  /**
   * GET /api/transmissions/today/:etablissementId
   * Récupérer les transmissions du jour
   */
  async getTransmissionsToday(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const transmissions = await transmissionService.getTransmissionsToday(etablissementId);

      res.status(200).json({
        success: true,
        data: transmissions,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération transmissions du jour:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des transmissions du jour',
      });
    }
  },

  /**
   * GET /api/transmissions/enfant/:enfantId
   * Récupérer les transmissions d'un enfant
   */
  async getTransmissionsByEnfant(req: Request, res: Response) {
    try {
      const { enfantId } = req.params;

      const transmissions = await transmissionService.getTransmissionsByEnfant(enfantId);

      res.status(200).json({
        success: true,
        data: transmissions,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération transmissions enfant:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des transmissions',
      });
    }
  },

  /**
   * GET /api/transmissions/stats/:etablissementId
   * Obtenir les statistiques des transmissions
   */
  async getTransmissionStats(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const stats = await transmissionService.getTransmissionStats(etablissementId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération stats transmissions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération des statistiques',
      });
    }
  },

  /**
   * GET /api/transmissions/:id
   * Récupérer une transmission par ID
   */
  async getTransmissionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const transmission = await transmissionService.getTransmissionById(id);

      if (!transmission) {
        return res.status(404).json({
          success: false,
          error: 'Transmission non trouvée',
        });
      }

      res.status(200).json({
        success: true,
        data: transmission,
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération transmission:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la récupération de la transmission',
      });
    }
  },

  /**
   * DELETE /api/transmissions/:id
   * Supprimer une transmission
   */
  async deleteTransmission(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await transmissionService.deleteTransmission(id);

      res.status(200).json({
        success: true,
        message: 'Transmission supprimée avec succès',
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression transmission:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de la suppression de la transmission',
      });
    }
  },
};
