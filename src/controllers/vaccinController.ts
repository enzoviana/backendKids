import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class VaccinController {
  async getVaccinsByEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async createVaccin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, data: { _id: 'temp' } });
    } catch (error) {
      next(error);
    }
  }
}

export const vaccinController = new VaccinController();
