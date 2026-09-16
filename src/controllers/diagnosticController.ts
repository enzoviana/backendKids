import type { Request, Response } from 'express';
import { diagnosticService } from '../services/diagnosticService';

export const diagnosticController = {
  async createDiagnostic(req: Request, res: Response) {
    try {
      const {
        enfantId,
        auteurId,
        auteurNom,
        symptomes,
        temperature,
        observations,
      } = req.body;

      if (!enfantId || !auteurId || !auteurNom || !symptomes) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const diagnostic = await diagnosticService.createDiagnostic({
        enfantId,
        auteurId,
        auteurNom,
        symptomes,
        temperature,
        observations,
      });

      res.status(201).json({ success: true, data: diagnostic });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDiagnosticsByEnfant(req: Request, res: Response) {
    try {
      const { enfantId } = req.params;

      const diagnostics = await diagnosticService.getDiagnosticsByEnfant(enfantId);

      res.status(200).json({ success: true, data: diagnostics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDiagnosticById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const diagnostic = await diagnosticService.getDiagnosticById(id);

      if (!diagnostic) {
        return res.status(404).json({ success: false, error: 'Diagnostic non trouvé' });
      }

      res.status(200).json({ success: true, data: diagnostic });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteDiagnostic(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await diagnosticService.deleteDiagnostic(id);

      res.status(200).json({ success: true, message: 'Diagnostic supprimé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDiagnosticStats(req: Request, res: Response) {
    try {
      const stats = await diagnosticService.getDiagnosticStats();

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
