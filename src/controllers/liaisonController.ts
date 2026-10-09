import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class LiaisonController {
  async getLiaisonsByEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async getAllLiaisons(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async createLiaison(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, data: { _id: 'temp' } });
    } catch (error) {
      next(error);
    }
  }

  async deleteLiaison(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const liaisonController = new LiaisonController();
