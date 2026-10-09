import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class CoordinationController {
  async getAvis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async getAffectations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async createAffectation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, data: { _id: 'temp', statut: 'active' } });
    } catch (error) {
      next(error);
    }
  }

  async deleteAffectation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { statut: 'revoquee' } });
    } catch (error) {
      next(error);
    }
  }

  async getDemandesRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  }

  async createDemandeRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(201).json({ success: true, data: { _id: 'temp', statut: 'en_attente' } });
    } catch (error) {
      next(error);
    }
  }

  async updateDemandeRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: { _id: req.params.demandeId, statut: 'acceptee' } });
    } catch (error) {
      next(error);
    }
  }
}

export const coordinationController = new CoordinationController();
