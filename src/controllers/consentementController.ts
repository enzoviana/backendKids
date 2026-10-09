import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class ConsentementController {
  async getConsentementsByEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async updateConsentement(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
}

export const consentementController = new ConsentementController();
