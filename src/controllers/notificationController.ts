import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { AuthRequest } from '../types';

/**
 * Contrôleur de gestion des notifications
 */
export class NotificationController {
  /**
   * GET /api/notifications
   * Récupérer toutes les notifications de l'utilisateur
   */
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const notifications = await notificationService.getNotificationsByUser(req.user.userId);

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notifications/unread
   * Récupérer les notifications non lues
   */
  async getUnreadNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const notifications = await notificationService.getUnreadNotifications(req.user.userId);

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notifications/count-unread
   * Compter les notifications non lues
   */
  async countUnread(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const result = await notificationService.countUnread(req.user.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marquer comme lue
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   * Marquer toutes comme lues
   */
  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const result = await notificationService.markAllAsRead(req.user.userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Supprimer une notification
   */
  async deleteNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const { id } = req.params;
      const result = await notificationService.deleteNotification(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/delete-all-read
   * Supprimer toutes les notifications lues
   */
  async deleteAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Non authentifié' });
        return;
      }

      const result = await notificationService.deleteAllRead(req.user.userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
