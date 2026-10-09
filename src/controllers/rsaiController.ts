import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class RsaiController {
  async getRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async getMyAffectations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async createAvisRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, data: { noteMoyenne: 0, nbAvis: 0 } });
    } catch (error) {
      next(error);
    }
  }
}

export const rsaiController = new RsaiController();
