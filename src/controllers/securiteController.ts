import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class SecuriteController {
  async getReglesAcces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { plages: [], geofences: [] } });
    } catch (error) {
      next(error);
    }
  }

  async updateReglesAcces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }

  async verifierAcces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { autorise: true, motif: null, distanceM: 0 } });
    } catch (error) {
      next(error);
    }
  }

  async getAlertes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }
}

export const securiteController = new SecuriteController();
