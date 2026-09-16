import prisma from '../config/prisma';

interface CreateMessageData {
  expediteurId: string;
  destinataireId: string;
  objet: string;
  contenu: string;
  important?: boolean;
  pieceJointe?: string;
}

export const messageService = {
  /**
   * Créer un nouveau message
   */
  async createMessage(data: CreateMessageData) {
    const message = await prisma.message.create({
      data: {
        expediteurId: data.expediteurId,
        destinataireId: data.destinataireId,
        objet: data.objet,
        contenu: data.contenu,
        important: data.important || false,
        pieceJointe: data.pieceJointe,
      },
    });

    return message;
  },

  /**
   * Récupérer les messages reçus par un utilisateur
   */
  async getMessagesRecus(userId: string, includeArchive = false) {
    const where: any = { destinataireId: userId };
    if (!includeArchive) {
      where.archive = false;
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return messages;
  },

  /**
   * Récupérer les messages envoyés par un utilisateur
   */
  async getMessagesEnvoyes(userId: string) {
    const messages = await prisma.message.findMany({
      where: { expediteurId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return messages;
  },

  /**
   * Marquer un message comme lu
   */
  async markAsRead(messageId: string) {
    await prisma.message.update({
      where: { id: messageId },
      data: { lu: true },
    });
  },

  /**
   * Archiver un message
   */
  async archiveMessage(messageId: string) {
    await prisma.message.update({
      where: { id: messageId },
      data: { archive: true },
    });
  },

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: string) {
    await prisma.message.delete({
      where: { id: messageId },
    });
  },

  /**
   * Compter les messages non lus
   */
  async countUnread(userId: string) {
    const count = await prisma.message.count({
      where: {
        destinataireId: userId,
        lu: false,
        archive: false,
      },
    });

    return count;
  },
};
