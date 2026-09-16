import type { Request, Response } from 'express';
import { ordonnanceService } from '../services/ordonnanceService';

export const ordonnanceController = {
  async createOrdonnance(req: Request, res: Response) {
    try {
      const {
        enfantId,
        medecinId,
        medecinNom,
        dateOrdonnance,
        dateExpiration,
        diagnostic,
        prescriptions,
        recommandations,
        fichierUrl,
      } = req.body;

      if (!enfantId || !medecinId || !medecinNom || !dateOrdonnance || !diagnostic || !prescriptions) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const ordonnance = await ordonnanceService.createOrdonnance({
        enfantId,
        medecinId,
        medecinNom,
        dateOrdonnance: new Date(dateOrdonnance),
        dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
        diagnostic,
        prescriptions,
        recommandations,
        fichierUrl,
      });

      res.status(201).json({ success: true, data: ordonnance });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getOrdonnancesByEnfant(req: Request, res: Response) {
    try {
      const { enfantId } = req.params;
      const { actives } = req.query;

      const ordonnances = await ordonnanceService.getOrdonnancesByEnfant(
        enfantId,
        actives === 'true'
      );

      res.status(200).json({ success: true, data: ordonnances });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getOrdonnancesByMedecin(req: Request, res: Response) {
    try {
      const { medecinId } = req.params;

      const ordonnances = await ordonnanceService.getOrdonnancesByMedecin(medecinId);

      res.status(200).json({ success: true, data: ordonnances });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getOrdonnanceById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ordonnance = await ordonnanceService.getOrdonnanceById(id);

      if (!ordonnance) {
        return res.status(404).json({ success: false, error: 'Ordonnance non trouvée' });
      }

      res.status(200).json({ success: true, data: ordonnance });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateOrdonnance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const ordonnance = await ordonnanceService.updateOrdonnance(id, data);

      res.status(200).json({ success: true, data: ordonnance, message: 'Ordonnance mise à jour avec succès' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteOrdonnance(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await ordonnanceService.deleteOrdonnance(id);

      res.status(200).json({ success: true, message: 'Ordonnance supprimée' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getOrdonnanceStats(req: Request, res: Response) {
    try {
      const { medecinId } = req.query;

      const stats = await ordonnanceService.getOrdonnanceStats(medecinId as string);

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
