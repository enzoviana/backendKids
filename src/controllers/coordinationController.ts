import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/prisma';
import { emailService } from '../services/emailService';
import { format } from 'date-fns';

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
   * Avec pagination, filtres (année, statut, rsaiId, crecheId) et stats
   */
  async getAffectations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const {
        statut,
        annee,
        rsaiId,
        crecheId,
        page = '1',
        limit = '50',
      } = req.query;

      const where: any = {};

      // Filtrer selon le rôle
      if (req.user.role === 'creche') {
        where.crecheId = req.user.userId;
      } else if (req.user.role === 'rsai') {
        where.rsaiId = req.user.userId;
      }
      // superadmin et developpeur voient tout

      // Filtres additionnels
      if (statut) where.statut = statut;
      if (rsaiId) where.rsaiId = rsaiId;
      if (crecheId) where.crecheId = crecheId;

      // Filtre par année
      if (annee) {
        const year = parseInt(annee as string);
        where.dateDebut = {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        };
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Récupérer les affectations paginées
      const affectations = await prisma.affectationRsai.findMany({
        where,
        orderBy: { dateDebut: 'desc' },
        skip,
        take: limitNum,
      });

      // Compter le total
      const total = await prisma.affectationRsai.count({ where });

      // Calculer les stats
      const statsData = {
        rsaiActives: await prisma.affectationRsai.groupBy({
          by: ['rsaiId'],
          where: { statut: 'active' },
        }),
        crechesCouvertes: await prisma.affectationRsai.groupBy({
          by: ['etablissementId'],
          where: { statut: 'active' },
        }),
        demandesEnAttente: await prisma.demandeRsai.count({
          where: { statut: 'en_attente' },
        }),
      };

      const stats = {
        rsaiActives: statsData.rsaiActives.length,
        crechesCouvertes: statsData.crechesCouvertes.length,
        demandesEnAttente: statsData.demandesEnAttente,
      };

      res.status(200).json({
        success: true,
        data: {
          total,
          page: pageNum,
          annee: annee ? parseInt(annee as string) : null,
          affectations,
          stats,
        },
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

      // Validation détaillée
      const missingFields: string[] = [];
      if (!rsaiId) missingFields.push('rsaiId');
      if (!crecheId) missingFields.push('crecheId');
      if (!etablissementId) missingFields.push('etablissementId');
      if (!dateDebut) missingFields.push('dateDebut');

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Champs manquants : ${missingFields.join(', ')}`,
          received: {
            rsaiId: rsaiId || null,
            crecheId: crecheId || null,
            etablissementId: etablissementId || null,
            dateDebut: dateDebut || null,
          },
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

      // Envoyer des emails de notification (ne pas bloquer la réponse si échec)
      try {
        // Récupérer les infos RSAI
        const rsai = await prisma.user.findUnique({
          where: { id: rsaiId },
          include: { profile: true },
        });

        // Récupérer les infos crèche
        const etablissement = await prisma.etablissement.findUnique({
          where: { id: etablissementId },
        });

        if (rsai && etablissement) {
          const horairesStr = horaires
            ? JSON.stringify(horaires)
            : 'À définir';

          const adresseStr = `${etablissement.adresse}, ${etablissement.codePostal} ${etablissement.ville}`;

          // Email à la RSAI
          await emailService.sendRsaiAffectation(rsai.email, {
            prenom: rsai.profile?.prenom || 'RSAI',
            nom_rsai: `${rsai.profile?.prenom || ''} ${rsai.profile?.nom || ''}`.trim(),
            nom_creche: etablissement.nom,
            adresse: adresseStr,
            horaires: horairesStr,
            date_debut: format(new Date(dateDebut), 'dd/MM/yyyy'),
            affectationId: affectation.id,
          });

          // TODO: Envoyer aussi à la crèche si besoin
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des emails d\'affectation:', emailError);
        // Ne pas bloquer la réponse
      }

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

      // Validation détaillée
      const missingFields: string[] = [];
      if (!etablissementId) missingFields.push('etablissementId');
      if (!motif) missingFields.push('motif');
      if (!dateDebut) missingFields.push('dateDebut');

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Champs manquants : ${missingFields.join(', ')}`,
          received: {
            etablissementId: etablissementId || null,
            motif: motif || null,
            dateDebut: dateDebut || null,
          },
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
