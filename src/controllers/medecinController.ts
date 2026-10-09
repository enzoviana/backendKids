import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

export class MedecinController {
  async getMedecins(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isActive } = req.query;

      const where: any = {
        role: 'medecin',
      };

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const medecins = await prisma.user.findMany({
        where,
        include: {
          profile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Formater les données pour le frontend
      const formattedMedecins = medecins.map(user => ({
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
        data: formattedMedecins,
        total: formattedMedecins.length,
      });
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
