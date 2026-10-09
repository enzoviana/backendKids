import type { Request, Response } from 'express';
import { tarifService } from '../services/tarifService';

export const tarifController = {
  async createTarif(req: Request, res: Response) {
    try {
      const {
        plan,
        nom,
        description,
        prixMensuel,
        prixAnnuel,
        fonctionnalites,
        limites,
      } = req.body;

      if (!plan || !nom || !prixMensuel || !prixAnnuel || !fonctionnalites || !limites) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const tarif = await tarifService.createTarif({
        plan,
        nom,
        description,
        prixMensuel,
        prixAnnuel,
        fonctionnalites,
        limites,
      });

      res.status(201).json({ success: true, data: tarif });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTarifsActifs(req: Request, res: Response) {
    try {
      const tarifs = await tarifService.getTarifsActifs();

      res.status(200).json({ success: true, data: tarifs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllTarifs(req: Request, res: Response) {
    try {
      const { roleCible } = req.query;

      const tarifs = await tarifService.getAllTarifs(roleCible as string);

      res.status(200).json({ success: true, data: tarifs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTarifByPlan(req: Request, res: Response) {
    try {
      const { plan } = req.params;

      const tarif = await tarifService.getTarifByPlan(plan);

      if (!tarif) {
        return res.status(404).json({ success: false, error: 'Tarif non trouvé' });
      }

      res.status(200).json({ success: true, data: tarif });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateTarif(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const tarif = await tarifService.updateTarif(id, data);

      res.status(200).json({ success: true, data: tarif, message: 'Tarif mis à jour avec succès' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async desactiverTarif(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await tarifService.desactiverTarif(id);

      res.status(200).json({ success: true, message: 'Tarif désactivé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteTarif(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await tarifService.deleteTarif(id);

      res.status(200).json({ success: true, message: 'Tarif supprimé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
