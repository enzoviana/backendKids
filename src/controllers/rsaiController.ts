import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

export class RsaiController {
  async getRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive, ville } = req.query;

      const where: any = {
        role: 'rsai',
      };

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const rsai = await prisma.user.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Filtrer par ville si nécessaire (via le profil)
      let filteredRsai = rsai;
      if (ville) {
        filteredRsai = rsai.filter(user =>
          user.profile?.ville?.toLowerCase() === (ville as string).toLowerCase()
        );
      }

      // Formater les données pour le frontend
      const formattedRsai = filteredRsai.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        prenom: user.profile?.prenom || '',
        nom: user.profile?.nom || '',
        tel: user.profile?.tel || '',
        adresse: user.profile?.adresse || '',
        ville: user.profile?.ville || '',
        photo: user.profile?.photo || '',
      }));

      res.status(200).json({
        success: true,
        data: formattedRsai,
        total: formattedRsai.length,
      });
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
