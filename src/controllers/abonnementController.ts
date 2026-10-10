import type { Request, Response } from 'express';
import { abonnementService } from '../services/abonnementService';
import { stripeService } from '../services/stripeService';
import { AuthRequest } from '../types';

export const abonnementController = {
  async createAbonnement(req: Request, res: Response) {
    try {
      const {
        etablissementId,
        plan,
        dateDebut,
        dateFin,
        prixMensuel,
        fonctionnalites,
        limites,
      } = req.body;

      if (!etablissementId || !plan || !dateDebut || !prixMensuel || !fonctionnalites || !limites) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const abonnement = await abonnementService.createAbonnement({
        etablissementId,
        plan,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : undefined,
        prixMensuel,
        fonctionnalites,
        limites,
      });

      res.status(201).json({ success: true, data: abonnement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAbonnementByEtablissement(req: Request, res: Response) {
    try {
      const { etablissementId } = req.params;

      const abonnement = await abonnementService.getAbonnementByEtablissement(etablissementId);

      if (!abonnement) {
        return res.status(404).json({ success: false, error: 'Aucun abonnement actif trouvé' });
      }

      res.status(200).json({ success: true, data: abonnement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAllAbonnements(req: Request, res: Response) {
    try {
      const abonnements = await abonnementService.getAllAbonnements();

      res.status(200).json({ success: true, data: abonnements });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const abonnement = await abonnementService.updateAbonnement(id, data);

      res.status(200).json({ success: true, data: abonnement, message: 'Abonnement mis à jour avec succès' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async suspendreAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await abonnementService.suspendreAbonnement(id);

      res.status(200).json({ success: true, message: 'Abonnement suspendu' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async reactiverAbonnement(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await abonnementService.reactiverAbonnement(id);

      res.status(200).json({ success: true, message: 'Abonnement réactivé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAbonnementStats(req: Request, res: Response) {
    try {
      const stats = await abonnementService.getAbonnementStats();

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMyAbonnement(req: AuthRequest, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
      }

      // TODO: Implémenter la vraie logique d'abonnement
      console.warn('⚠️ [MOCK] getMyAbonnement - Données mockées retournées');
      console.log('💡 Implémentez la table Abonnement liée à l\'utilisateur pour des données réelles');

      res.status(200).json({
        success: true,
        data: {
          plan: 'essentiel',
          statut: 'actif',
          prixMensuel: 0,
          quota: {},
        },
        _mock: true,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getRevenus(req: Request, res: Response) {
    try {
      console.warn('⚠️ [MOCK] getRevenus - Données mockées retournées');
      console.log('💡 Intégrez Stripe pour récupérer les revenus réels');

      res.status(200).json({ success: true, data: [], _mock: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createCheckoutSession(req: AuthRequest, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;
      const userEmail = authReq.user?.email;
      const { priceId, plan } = req.body;

      if (!userId || !userEmail) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
      }

      if (!priceId) {
        return res.status(400).json({ success: false, error: 'priceId requis' });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const successUrl = `${frontendUrl}/abonnement/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/abonnement/cancel`;

      const session = await stripeService.createCheckoutSession({
        priceId,
        userId,
        userEmail,
        successUrl,
        cancelUrl,
      });

      res.status(200).json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createPortalSession(req: AuthRequest, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
      }

      // TODO: Récupérer le customerId Stripe de l'utilisateur depuis la DB
      const customerId = 'cus_mock_' + userId; // Mock pour l'instant

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const returnUrl = `${frontendUrl}/abonnement`;

      const session = await stripeService.createPortalSession({
        customerId,
        returnUrl,
      });

      res.status(200).json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async attribuerAbonnement(req: Request, res: Response) {
    try {
      console.warn('⚠️ [MOCK] attribuerAbonnement - Données mockées retournées');
      console.log('💡 Implémentez la logique d\'attribution d\'abonnement admin');

      res.status(200).json({ success: true, data: {}, _mock: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
