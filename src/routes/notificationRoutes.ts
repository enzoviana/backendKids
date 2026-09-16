import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * GET /api/notifications
 * Récupérer toutes les notifications
 */
router.get('/', notificationController.getNotifications.bind(notificationController));

/**
 * GET /api/notifications/unread
 * Récupérer les notifications non lues
 */
router.get('/unread', notificationController.getUnreadNotifications.bind(notificationController));

/**
 * GET /api/notifications/count-unread
 * Compter les notifications non lues
 */
router.get('/count-unread', notificationController.countUnread.bind(notificationController));

/**
 * POST /api/notifications/mark-all-read
 * Marquer toutes comme lues
 */
router.post('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

/**
 * DELETE /api/notifications/delete-all-read
 * Supprimer toutes les notifications lues
 */
router.delete(
  '/delete-all-read',
  notificationController.deleteAllRead.bind(notificationController)
);

/**
 * PATCH /api/notifications/:id/read
 * Marquer comme lue
 */
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

export default router;
