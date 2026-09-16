import prisma from '../config/prisma';

/**
 * Service de gestion des notifications
 */
export class NotificationService {
  /**
   * Récupérer toutes les notifications d'un utilisateur
   */
  async getNotificationsByUser(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: { destinataireId: userId },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limiter aux 100 dernières
    });

    return notifications;
  }

  /**
   * Récupérer les notifications non lues
   */
  async getUnreadNotifications(userId: string) {
    const notifications = await prisma.notification.findMany({
      where: {
        destinataireId: userId,
        lu: false,
      },
      include: {
        enfant: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.destinataireId !== userId) {
      throw new Error('Notification non trouvée ou accès non autorisé');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { lu: true },
    });

    return updated;
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        destinataireId: userId,
        lu: false,
      },
      data: { lu: true },
    });

    return { message: 'Toutes les notifications ont été marquées comme lues' };
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.destinataireId !== userId) {
      throw new Error('Notification non trouvée ou accès non autorisé');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification supprimée' };
  }

  /**
   * Supprimer toutes les notifications lues
   */
  async deleteAllRead(userId: string) {
    await prisma.notification.deleteMany({
      where: {
        destinataireId: userId,
        lu: true,
      },
    });

    return { message: 'Notifications lues supprimées' };
  }

  /**
   * Compter les notifications non lues
   */
  async countUnread(userId: string) {
    const count = await prisma.notification.count({
      where: {
        destinataireId: userId,
        lu: false,
      },
    });

    return { count };
  }
}

export const notificationService = new NotificationService();
