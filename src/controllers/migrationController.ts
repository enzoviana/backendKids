import type { Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthRequest } from '../types';

const execPromise = promisify(exec);

/**
 * Controller pour gérer les migrations de base de données
 */
export const migrationController = {
  /**
   * Appliquer les migrations Prisma
   * POST /api/admin/migrate
   */
  async applyMigrations(req: AuthRequest, res: Response) {
    try {
      // Vérifier que l'utilisateur est SuperAdmin
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé. Seul le SuperAdmin peut appliquer les migrations.',
        });
      }

      console.log('🚀 Début de l\'application des migrations...');

      // Exécuter prisma migrate deploy
      const { stdout, stderr } = await execPromise('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: process.env,
      });

      console.log('✅ Migrations appliquées avec succès');
      console.log('STDOUT:', stdout);
      if (stderr) {
        console.log('STDERR:', stderr);
      }

      res.status(200).json({
        success: true,
        message: 'Migrations appliquées avec succès',
        output: stdout,
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'application des migrations:', error);

      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'application des migrations',
        details: error.message,
        output: error.stdout || error.stderr,
      });
    }
  },

  /**
   * Vérifier l'état des migrations
   * GET /api/admin/migrate/status
   */
  async getMigrationStatus(req: AuthRequest, res: Response) {
    try {
      // Vérifier que l'utilisateur est SuperAdmin
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé.',
        });
      }

      // Vérifier l'état des migrations
      const { stdout } = await execPromise('npx prisma migrate status', {
        cwd: process.cwd(),
        env: process.env,
      });

      res.status(200).json({
        success: true,
        status: stdout,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification des migrations',
        details: error.message,
        output: error.stdout || error.stderr,
      });
    }
  },
};
