import prisma from '../config/prisma';

interface CreateLogData {
  type: string;
  module: string;
  action: string;
  userId?: string;
  userName?: string;
  message: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export const logService = {
  /**
   * Créer un nouveau log
   */
  async createLog(data: CreateLogData) {
    const log = await prisma.logSysteme.create({
      data: {
        type: data.type,
        module: data.module,
        action: data.action,
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return log;
  },

  /**
   * Récupérer les logs avec filtres
   */
  async getLogs(filters?: {
    type?: string;
    module?: string;
    userId?: string;
    dateDebut?: Date;
    dateFin?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.module) where.module = filters.module;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {};
      if (filters.dateDebut) where.createdAt.gte = filters.dateDebut;
      if (filters.dateFin) where.createdAt.lte = filters.dateFin;
    }

    const logs = await prisma.logSysteme.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return logs;
  },

  /**
   * Récupérer les logs par type
   */
  async getLogsByType(type: string, limit = 100) {
    const logs = await prisma.logSysteme.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  },

  /**
   * Récupérer les logs d'un utilisateur
   */
  async getLogsByUser(userId: string, limit = 100) {
    const logs = await prisma.logSysteme.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  },

  /**
   * Obtenir les statistiques des logs
   */
  async getLogStats() {
    const total = await prisma.logSysteme.count();
    const errors = await prisma.logSysteme.count({ where: { type: 'error' } });
    const warnings = await prisma.logSysteme.count({ where: { type: 'warning' } });
    const critical = await prisma.logSysteme.count({ where: { type: 'critical' } });

    // Logs des dernières 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const last24h = await prisma.logSysteme.count({
      where: { createdAt: { gte: yesterday } },
    });

    return {
      total,
      errors,
      warnings,
      critical,
      info: total - errors - warnings - critical,
      last24h,
    };
  },

  /**
   * Supprimer les anciens logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await prisma.logSysteme.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        type: { not: 'critical' },
      },
    });
  },
};
