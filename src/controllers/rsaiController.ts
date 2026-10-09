import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

export class RsaiController {
  /**
   * GET /api/rsai/:rsaiId
   * Fiche détaillée d'une RSAI
   */
  async getRsaiById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rsaiId } = req.params;

      // Récupérer l'utilisateur RSAI avec son profil
      const rsai = await prisma.user.findUnique({
        where: { id: rsaiId, role: 'rsai' },
        include: { profile: true },
      });

      if (!rsai) {
        res.status(404).json({ success: false, error: 'RSAI non trouvée' });
        return;
      }

      // Récupérer les affectations
      const affectations = await prisma.affectationRsai.findMany({
        where: { rsaiId },
        orderBy: { dateDebut: 'desc' },
      });

      // Récupérer les avis
      const avis = await prisma.avisRsai.findMany({
        where: { rsaiId },
        orderBy: { createdAt: 'desc' },
      });

      // Calculer la note moyenne
      const noteMoyenne = avis.length > 0
        ? avis.reduce((sum, a) => sum + a.note, 0) / avis.length
        : 0;

      res.status(200).json({
        success: true,
        data: {
          _id: rsai.id,
          prenom: rsai.profile?.prenom || '',
          nom: rsai.profile?.nom || '',
          email: rsai.email,
          telephone: rsai.profile?.tel || '',
          qualification: 'Infirmière Puéricultrice DE', // TODO: ajouter dans profil
          noteMoyenne: Math.round(noteMoyenne * 10) / 10,
          nbAvis: avis.length,
          affectations: affectations.map(a => ({
            _id: a.id,
            crecheId: a.crecheId,
            etablissementId: a.etablissementId,
            statut: a.statut,
            dateDebut: a.dateDebut,
            dateFin: a.dateFin,
            horaires: a.horaires,
          })),
          avis: avis.map(a => ({
            _id: a.id,
            auteurNom: a.auteurNom,
            note: a.note,
            commentaire: a.commentaire,
            createdAt: a.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

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
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { statut } = req.query;

      const where: any = {
        rsaiId: req.user.userId,
      };

      if (statut) {
        where.statut = statut;
      }

      const affectations = await prisma.affectationRsai.findMany({
        where,
        orderBy: { dateDebut: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: affectations,
        total: affectations.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async createAvisRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { rsaiId } = req.params;
      const { note, commentaire } = req.body;

      if (!note || note < 1 || note > 5) {
        res.status(400).json({
          success: false,
          error: 'La note doit être entre 1 et 5',
        });
        return;
      }

      // Récupérer le profil pour le nom
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user.userId },
      });

      const avis = await prisma.avisRsai.create({
        data: {
          rsaiId,
          crecheId: req.user.userId,
          auteurId: req.user.userId,
          auteurNom: profile ? `${profile.prenom} ${profile.nom}` : req.user.email || 'Utilisateur',
          note,
          commentaire: commentaire || null,
        },
      });

      // Calculer la note moyenne et le nombre d'avis
      const allAvis = await prisma.avisRsai.findMany({
        where: { rsaiId },
      });

      const noteMoyenne = allAvis.reduce((sum, a) => sum + a.note, 0) / allAvis.length;

      res.status(201).json({
        success: true,
        data: avis,
        stats: {
          noteMoyenne: Math.round(noteMoyenne * 10) / 10,
          nbAvis: allAvis.length,
        },
        message: 'Avis créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const rsaiController = new RsaiController();
