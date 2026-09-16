import type { Request, Response } from 'express';
import { abonnementService } from '../services/abonnementService';

export const abonnementController = {
  async createAbonnement(req: Request, res: Response) {
    try {
      const {
        etablissementId,
        plan,
        dateDebut,
        dateFin,
        prixMensuel,
        fonctionnalites,
        limites,
      } = req.body;

      if (!etablissementId || !plan || !dateDebut || !prixMensuel || !fonctionnalites || !limites) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const abonnement = await abonnementService.createAbonnement({
        etablissementId,
        plan,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : undefined,
        prixMensuel,
        fonctionnalites,
        limites,
      });

      res.status(201).json({ success: true, data: abonnement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAbonnementByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const abonnement = await abonnementService.getAbonnementByEtablissement(etablissementId);

      if (!abonnement) {
        return res.status(404).json({ success: false, error: 'Aucun abonnement actif trouvé' });
      }

      res.status(200).json({ success: true, data: abonnement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllAbonnements(req: Request, res: Response) {
    try {
      const abonnements = await abonnementService.getAllAbonnements();

      res.status(200).json({ success: true, data: abonnements });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const abonnement = await abonnementService.updateAbonnement(id, data);

      res.status(200).json({ success: true, data: abonnement, message: 'Abonnement mis à jour avec succès' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async suspendreAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await abonnementService.suspendreAbonnement(id);

      res.status(200).json({ success: true, message: 'Abonnement suspendu' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async reactiverAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await abonnementService.reactiverAbonnement(id);

      res.status(200).json({ success: true, message: 'Abonnement réactivé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAbonnementStats(req: Request, res: Response) {
    try {
      const stats = await abonnementService.getAbonnementStats();

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
