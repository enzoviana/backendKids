import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';

export class CoordinationController {
  /**
   * GET /api/coordination/avis
   * Avis réciproques crèche/RSAI
   */
  async getAvis(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const where: any = {};

      // Filtrer selon le rôle
      if (req.user.role === 'creche') {
        where.crecheId = req.user.userId;
      } else if (req.user.role === 'rsai') {
        where.rsaiId = req.user.userId;
      }
      // superadmin et developpeur voient tout

      const avis = await prisma.avisRsai.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: avis,
        total: avis.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coordination/affectations
   * Affectations RSAI : admin toutes, crèche les siennes, RSAI ses affectations
   */
  async getAffectations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { statut } = req.query;

      const where: any = {};

      // Filtrer selon le rôle
      if (req.user.role === 'creche') {
        where.crecheId = req.user.userId;
      } else if (req.user.role === 'rsai') {
        where.rsaiId = req.user.userId;
      }
      // superadmin et developpeur voient tout

      if (statut) {
        where.statut = statut;
      }

      const affectations = await prisma.affectationRsai.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

  /**
   * POST /api/coordination/affectations
   * Admin uniquement : affecter une RSAI à une crèche
   */
  async createAffectation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const {
        rsaiId,
        crecheId,
        etablissementId,
        dateDebut,
        dateFin,
        horaires,
        perimetreGps,
      } = req.body;

      if (!rsaiId || !crecheId || !etablissementId || !dateDebut) {
        res.status(400).json({
          success: false,
          error: 'Champs requis : rsaiId, crecheId, etablissementId, dateDebut',
        });
        return;
      }

      const affectation = await prisma.affectationRsai.create({
        data: {
          rsaiId,
          crecheId,
          etablissementId,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          horaires: horaires || null,
          perimetreGps: perimetreGps || null,
          statut: 'active',
          creePar: req.user.userId,
        },
      });

      res.status(201).json({
        success: true,
        data: affectation,
        message: 'Affectation créée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/coordination/affectations/:affectationId
   * Révoquer une affectation (admin)
   */
  async deleteAffectation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { affectationId } = req.params;

      const affectation = await prisma.affectationRsai.update({
        where: { id: affectationId },
        data: {
          statut: 'revoquee',
          revoqueePar: req.user.userId,
          dateRevocation: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        data: affectation,
        message: 'Affectation révoquée',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coordination/demandes-rsai
   * Crèche : ses demandes ; admin : toutes les demandes d'intervention RSAI
   */
  async getDemandesRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { statut } = req.query;

      const where: any = {};

      // Filtrer selon le rôle
      if (req.user.role === 'creche') {
        where.crecheId = req.user.userId;
      }
      // superadmin et developpeur voient tout

      if (statut) {
        where.statut = statut;
      }

      const demandes = await prisma.demandeRsai.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: demandes,
        total: demandes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/coordination/demandes-rsai
   * La crèche demande une RSAI
   */
  async createDemandeRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId, motif, dateDebut, dateFin, urgence } = req.body;

      if (!etablissementId || !motif || !dateDebut) {
        res.status(400).json({
          success: false,
          error: 'Champs requis : etablissementId, motif, dateDebut',
        });
        return;
      }

      const demande = await prisma.demandeRsai.create({
        data: {
          crecheId: req.user.userId,
          etablissementId,
          motif,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          urgence: urgence || false,
          statut: 'en_attente',
        },
      });

      res.status(201).json({
        success: true,
        data: demande,
        message: 'Demande créée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/coordination/demandes-rsai/:demandeId
   * Admin traite une demande (accepter/refuser)
   */
  async updateDemandeRsai(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { demandeId } = req.params;
      const { statut, commentaire } = req.body;

      if (!statut) {
        res.status(400).json({
          success: false,
          error: 'Le statut est requis (acceptee, refusee)',
        });
        return;
      }

      const demande = await prisma.demandeRsai.update({
        where: { id: demandeId },
        data: {
          statut,
          traitePar: req.user.userId,
          commentaire: commentaire || null,
          dateTraitement: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        data: demande,
        message: 'Demande mise à jour',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const coordinationController = new CoordinationController();
