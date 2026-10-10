import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { smsService } from '../services/smsService';
import { ApiError } from '../middleware/errorHandler';

/**
 * Contrôleur pour l'authentification à deux facteurs (MFA) par SMS
 */
export class MfaController {
  /**
   * POST /api/auth/mfa/send-code
   * Envoyer un code de vérification par SMS
   */
  async sendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, phone } = req.body;

      if (!userId || !phone) {
        res.status(400).json({
          success: false,
          error: 'userId et phone sont requis',
        });
        return;
      }

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé',
        });
        return;
      }

      // Formater le numéro de téléphone
      const formattedPhone = smsService.formatPhoneNumber(phone);

      // Générer un code à 6 chiffres
      const code = smsService.generateCode();

      // Définir l'expiration (5 minutes)
      const expiresAt = new Date();
      const expirationMinutes = parseInt(process.env.MFA_CODE_EXPIRATION || '300') / 60;
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      // Supprimer les anciens codes non utilisés de cet utilisateur
      await prisma.mfaCode.deleteMany({
        where: {
          userId,
          used: false,
        },
      });

      // Créer le code en base de données
      await prisma.mfaCode.create({
        data: {
          userId,
          code,
          phone: formattedPhone,
          expiresAt,
        },
      });

      // Envoyer le SMS
      const message = `Votre code de vérification Kids'Med IA : ${code}. Valable ${expirationMinutes} minutes.`;
      const sent = await smsService.sendSMS({
        phone: formattedPhone,
        message,
      });

      if (!sent) {
        res.status(500).json({
          success: false,
          error: 'Erreur lors de l\'envoi du SMS',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Code de vérification envoyé par SMS',
        expiresIn: expirationMinutes * 60, // en secondes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/mfa/verify-code
   * Vérifier un code de vérification SMS
   */
  async verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        res.status(400).json({
          success: false,
          error: 'userId et code sont requis',
        });
        return;
      }

      // Rechercher le code
      const mfaCode = await prisma.mfaCode.findFirst({
        where: {
          userId,
          code,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!mfaCode) {
        res.status(400).json({
          success: false,
          error: 'Code invalide',
          verified: false,
        });
        return;
      }

      // Vérifier si le code n'est pas expiré
      if (mfaCode.expiresAt < new Date()) {
        res.status(400).json({
          success: false,
          error: 'Code expiré',
          verified: false,
        });
        return;
      }

      // Marquer le code comme utilisé
      await prisma.mfaCode.update({
        where: { id: mfaCode.id },
        data: { used: true },
      });

      res.status(200).json({
        success: true,
        message: 'Code vérifié avec succès',
        verified: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mfaController = new MfaController();
