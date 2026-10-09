import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

export class MedecinController {
  /**
   * GET /api/medecins/:medecinId
   * Fiche détaillée d'un médecin
   */
  async getMedecinById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medecinId } = req.params;

      // Récupérer l'utilisateur médecin avec son profil
      const medecin = await prisma.user.findUnique({
        where: { id: medecinId, role: 'medecin' },
        include: { profile: true },
      });

      if (!medecin) {
        res.status(404).json({ success: false, error: 'Médecin non trouvé' });
        return;
      }

      // Récupérer les ordonnances récentes
      const ordonnances = await prisma.ordonnance.findMany({
        where: { medecinId },
        orderBy: { dateOrdonnance: 'desc' },
        take: 10,
      });

      res.status(200).json({
        success: true,
        data: {
          _id: medecin.id,
          prenom: medecin.profile?.prenom || '',
          nom: medecin.profile?.nom || '',
          specialite: 'Pédiatre', // TODO: ajouter dans profil
          rpps: '10101234567', // TODO: ajouter dans profil
          email: medecin.email,
          telephone: medecin.profile?.tel || '',
          enfantsSuivis: [], // TODO: implémenter relation enfant-médecin
          ordonnancesRecentes: ordonnances.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

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
