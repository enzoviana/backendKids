import type { Request, Response } from 'express';
import { messageService } from '../services/messageService';
import { emailService } from '../services/emailService';
import prisma from '../config/prisma';

export const messageController = {
  async createMessage(req: Request, res: Response) {
    try {
      const { expediteurId, destinataireId, objet, contenu, important, pieceJointe } = req.body;

      if (!expediteurId || !destinataireId || !objet || !contenu) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const message = await messageService.createMessage({
        expediteurId,
        destinataireId,
        objet,
        contenu,
        important,
        pieceJointe,
      });

      // Envoyer un email au destinataire (ne pas bloquer si échec)
      try {
        const expediteur = await prisma.user.findUnique({
          where: { id: expediteurId },
          include: { profile: true },
        });

        const destinataire = await prisma.user.findUnique({
          where: { id: destinataireId },
          include: { profile: true },
        });

        if (expediteur && destinataire) {
          const apercu = contenu.length > 150 ? contenu.substring(0, 150) + '...' : contenu;

          await emailService.sendNewMessage(destinataire.email, {
            prenom: destinataire.profile?.prenom || 'Utilisateur',
            expediteur: `${expediteur.profile?.prenom || ''} ${expediteur.profile?.nom || ''}`.trim() || 'Un utilisateur',
            objet,
            apercu,
            messageId: message.id,
          });
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi de l\'email de notification:', emailError);
        // Ne pas bloquer la réponse
      }

      res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMessagesRecus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { includeArchive } = req.query;

      const messages = await messageService.getMessagesRecus(userId, includeArchive === 'true');

      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMessagesEnvoyes(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const messages = await messageService.getMessagesEnvoyes(userId);

      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await messageService.markAsRead(id);

      res.status(200).json({ success: true, message: 'Message marqué comme lu' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async archiveMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await messageService.archiveMessage(id);

      res.status(200).json({ success: true, message: 'Message archivé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await messageService.deleteMessage(id);

      res.status(200).json({ success: true, message: 'Message supprimé' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async countUnread(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const count = await messageService.countUnread(userId);

      res.status(200).json({ success: true, data: count });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
