import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class MedecinController {
  async getMedecins(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async getMedecinStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { patients: 0, consultationsMois: 0, ordonnancesMois: 0, parMois: [] } });
    } catch (error) {
      next(error);
    }
  }
}

export const medecinController = new MedecinController();
