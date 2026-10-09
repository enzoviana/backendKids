import type { Request, Response } from 'express';
import { logService } from '../services/logService';

export const logController = {
  async createLog(req: Request, res: Response) {
    try {
      const {
        type,
        module,
        action,
        userId,
        userName,
        message,
        details,
        ipAddress,
        userAgent,
      } = req.body;

      if (!type || !module || !action || !message) {
        return res.status(400).json({ success: false, error: 'Champs requis manquants' });
      }

      const log = await logService.createLog({
        type,
        module,
        action,
        userId,
        userName,
        message,
        details,
        ipAddress,
        userAgent,
      });

      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      const { type, module, userId, dateDebut, dateFin, limit } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (module) filters.module = module as string;
      if (userId) filters.userId = userId as string;
      if (dateDebut) filters.dateDebut = new Date(dateDebut as string);
      if (dateFin) filters.dateFin = new Date(dateFin as string);
      if (limit) filters.limit = parseInt(limit as string);

      const logs = await logService.getLogs(filters);

      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogsByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { limit } = req.query;

      const logs = await logService.getLogsByType(
        type,
        limit ? parseInt(limit as string) : 100
      );

      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogsByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limit } = req.query;

      const logs = await logService.getLogsByUser(
        userId,
        limit ? parseInt(limit as string) : 100
      );

      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogStats(req: Request, res: Response) {
    try {
      const stats = await logService.getLogStats();

      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async cleanOldLogs(req: Request, res: Response) {
    try {
      const { daysToKeep } = req.query;

      await logService.cleanOldLogs(
        daysToKeep ? parseInt(daysToKeep as string) : 90
      );

      res.status(200).json({ success: true, message: 'Anciens logs nettoyés' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogsSecurite(req: Request, res: Response) {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLogsSecuriteByEnfant(req: Request, res: Response) {
    try {
      res.status(200).json({ success: true, data: [] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
