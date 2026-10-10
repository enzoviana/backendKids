import { Response, NextFunction } from 'express';
import { enfantService } from '../services/enfantService';
import { AuthRequest } from '../types';

/**
 * Contrôleur de gestion des enfants
 */
export class EnfantController {
  /**
   * POST /api/enfants
   * Créer un nouvel enfant
   */
  async createEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId, ...data } = req.body;
      const enfant = await enfantService.createEnfant(data, etablissementId);

      res.status(201).json({
        success: true,
        data: enfant,
        message: 'Enfant créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants
   * Récupérer tous les enfants (SuperAdmin uniquement)
   */
  async getAllEnfants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      // Vérifier que l'utilisateur est SuperAdmin
      if (req.user.role !== 'superadmin') {
        res.status(403).json({ success: false, error: 'Accès réservé aux SuperAdmin' });
        return;
      }

      const enfants = await enfantService.getAllEnfants();

      res.status(200).json({
        success: true,
        data: enfants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/etablissement/:etablissementId
   * Récupérer les enfants d'un établissement
   */
  async getEnfants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { etablissementId } = req.params;
      const enfants = await enfantService.getEnfantsByEtablissement(
        etablissementId,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        data: enfants,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/:id
   * Récupérer un enfant par ID
   */
  async getEnfantById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.getEnfantById(id, req.user.userId, req.user.role);

      res.status(200).json({
        success: true,
        data: enfant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/enfants/:id
   * Mettre à jour un enfant
   */
  async updateEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.updateEnfant(id, req.body);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Enfant mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/regenerer-code
   * Régénérer le code confidentiel
   */
  async regenererCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const enfant = await enfantService.regenererCode(id, req.user.userId, req.user.role);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Code confidentiel régénéré avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/lier-parent
   * Lier un parent à un enfant via le code
   */
  async lierParent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { code } = req.body;
      const enfant = await enfantService.lierParent(code, req.user.userId);

      res.status(200).json({
        success: true,
        data: enfant,
        message: 'Enfant lié avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/enfants/:id
   * Supprimer un enfant
   */
  async deleteEnfant(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const result = await enfantService.deleteEnfant(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/lier-code
   * Lier l'utilisateur connecté à un enfant via le code
   */
  async lierCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { code } = req.body;
      // TODO: Implémenter la logique pour tous les rôles (pas seulement parent)
      const enfant = await enfantService.lierParent(code, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          _id: enfant.id,
          prenom: enfant.prenom,
          nom: enfant.nom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/:id/qrcode
   * QR code de liaison parent
   */
  async getQRCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Générer le QR code
      res.status(200).json({
        success: true,
        data: {
          code: 'LEA-1234',
          qrCodeUrl: 'data:image/png;base64,...',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/enfants/:id/dossier-medical
   * Mise à jour du dossier médical
   */
  async updateDossierMedical(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { groupeSanguin, allergies, antecedents } = req.body;
      // TODO: Implémenter la mise à jour
      res.status(200).json({
        success: true,
        data: {
          _id: id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/:id/notes
   * Récupérer les notes d'un enfant
   */
  async getNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implémenter la logique
      res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/notes
   * Créer une note pour un enfant
   */
  async createNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { contenu, visibilite, destinataire } = req.body;
      // TODO: Implémenter la logique
      res.status(201).json({
        success: true,
        data: {
          _id: 'temp-id',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/enfants/:id/echanges-documents
   * Récupérer les échanges de documents
   */
  async getEchangesDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implémenter la logique
      res.status(200).json({
        success: true,
        data: [],
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/echanges-documents
   * Créer un échange de document
   */
  async createEchangeDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action, destinataire, type, message, documentId, demandeId, echeance } = req.body;
      // TODO: Implémenter la logique
      res.status(201).json({
        success: true,
        data: {
          _id: 'temp-id',
          statut: 'en_attente',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/symptom
   * Signaler des symptômes pour un enfant (parent, crèche, médecin)
   */
  async reportSymptom(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: enfantId } = req.params;
      const { symptomes, note } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }

      const enfant = await enfantService.getEnfantById(enfantId, userId, userRole);
      if (!enfant) {
        res.status(404).json({ success: false, message: 'Enfant non trouvé' });
        return;
      }

      // Créer une description des symptômes
      const description = `Symptômes signalés: ${symptomes.join(', ')}${note ? '\nNote: ' + note : ''}`;

      // TODO: Créer une vraie alerte quand le service sera disponible
      // const alerte = await alerteService.createAlerte({
      //   enfantId,
      //   type: 'symptome',
      //   description,
      //   severite: symptomes.length > 3 ? 'haute' : 'moyenne',
      //   statutResolution: 'en_attente',
      //   auteurId: userId,
      // });

      // TODO: Envoyer notification à la crèche/parents
      // await notificationService.sendNotification({
      //   destinataires: [enfant.etablissementId],
      //   titre: `Symptômes signalés - ${enfant.prenom}`,
      //   message: description,
      //   type: 'alerte',
      // });

      res.status(201).json({
        success: true,
        message: 'Symptômes signalés avec succès',
        data: {
          enfantId,
          symptomes,
          note,
          description,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/enfants/:id/sos
   * Déclencher une alerte SOS/urgence
   */
  async triggerSOS(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: enfantId } = req.params;
      const { motif } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }

      const enfant = await enfantService.getEnfantById(enfantId, userId, userRole);
      if (!enfant) {
        res.status(404).json({ success: false, message: 'Enfant non trouvé' });
        return;
      }

      const description = `🚨 ALERTE SOS - ${motif}`;

      // TODO: Créer une alerte critique SOS
      // const alerte = await alerteService.createAlerte({
      //   enfantId,
      //   type: 'sos',
      //   description,
      //   severite: 'critique',
      //   statutResolution: 'en_attente',
      //   auteurId: userId,
      // });

      // TODO: Notifier TOUS les acteurs liés (parents, crèche, médecin, RSAI)
      // await notificationService.sendNotification({
      //   destinataires: [...liaisons, etablissement],
      //   titre: `🚨 ALERTE SOS - ${enfant.prenom} ${enfant.nom}`,
      //   message: `Urgence signalée: ${motif}`,
      //   type: 'sos',
      // });

      // TODO: Logger l'événement de sécurité
      // await logService.createLog({
      //   type: 'securite',
      //   niveau: 'alerte',
      //   message: `SOS déclenché pour enfant ${enfantId}`,
      //   utilisateurId: userId,
      //   metadata: { enfantId, motif },
      // });

      res.status(201).json({
        success: true,
        message: 'Alerte SOS déclenchée',
        data: {
          enfantId,
          motif,
          description,
          notification_sent: false, // Sera true quand notifications implémentées
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const enfantController = new EnfantController();
