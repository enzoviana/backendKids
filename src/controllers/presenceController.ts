import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class PresenceController {
  async getPresenceStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { periode } = req.query;
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }
}

export const presenceController = new PresenceController();
