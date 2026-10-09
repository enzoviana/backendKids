import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class RendezVousController {
  async getRendezVousMedecin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }
}

export const rendezVousController = new RendezVousController();
