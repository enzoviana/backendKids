import { Request, Response, NextFunction } from 'express';
import { etablissementService } from '../services/etablissementService';
import prisma from '../config/prisma';

/**
 * Contrôleur pour la gestion des établissements
 */
export const etablissementController = {
  /**
   * Récupérer un établissement par ID
   */
  async getEtablissementById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const etablissement = await etablissementService.getEtablissementById(id);

      res.status(200).json({
        success: true,
        data: etablissement,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Récupérer tous les établissements
   */
  async getAllEtablissements(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, ville } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (ville) {
        filters.ville = ville as string;
      }

      const etablissements = await etablissementService.getAllEtablissements(filters);

      res.status(200).json({
        success: true,
        data: etablissements,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Créer un nouvel établissement
   */
  async createEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        nom,
        type,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        numeroAgrement,
        capaciteAccueil,
        horaires,
      } = req.body;

      // Validation
      if (!nom || !type || !adresse || !codePostal || !ville || !capaciteAccueil) {
        return res.status(400).json({
          success: false,
          error: 'Champs obligatoires manquants',
        });
      }

      const etablissement = await etablissementService.createEtablissement({
        nom,
        type,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        numeroAgrement,
        capaciteAccueil: Number(capaciteAccueil),
        horaires,
      });

      res.status(201).json({
        success: true,
        data: etablissement,
        message: 'Établissement créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mettre à jour un établissement
   */
  async updateEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const etablissement = await etablissementService.updateEtablissement(id, updateData);

      res.status(200).json({
        success: true,
        data: etablissement,
        message: 'Établissement mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Désactiver un établissement
   */
  async deactivateEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const etablissement = await etablissementService.deactivateEtablissement(id);

      res.status(200).json({
        success: true,
        data: etablissement,
        message: 'Établissement désactivé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Supprimer un établissement
   */
  async deleteEtablissement(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await etablissementService.deleteEtablissement(id);

      res.status(200).json({
        success: true,
        message: 'Établissement supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Récupérer les statistiques d'un établissement
   */
  async getEtablissementStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const stats = await etablissementService.getEtablissementStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  async getSanteIndicateurs(req: Request, res: Response) {
    try {
      res.status(200).json({ success: true, data: { vaccinsAJour: 0, allergiques: 0, pai: 0, traitementsEnCours: 0, evolution: [] } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createAvisRsai(req: Request, res: Response) {
    try {
      res.status(201).json({ success: true, data: { _id: 'temp', noteMoyenne: 0, nbAvis: 0 } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /api/etablissements/:id/securite
   * Récupérer les paramètres de sécurité
   */
  async getSecurite(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      let securite = await prisma.etablissementSecurite.findUnique({
        where: { etablissementId: id },
      });

      // Si pas de config, créer une config par défaut
      if (!securite) {
        securite = await prisma.etablissementSecurite.create({
          data: {
            etablissementId: id,
            rayonMetres: 300,
            blocageHorsZone: false,
            plagesHoraires: [
              { jour: 1, debut: '07:30', fin: '18:30' },
              { jour: 2, debut: '07:30', fin: '18:30' },
              { jour: 3, debut: '07:30', fin: '18:30' },
              { jour: 4, debut: '07:30', fin: '18:30' },
              { jour: 5, debut: '07:30', fin: '18:30' },
            ],
            ipsAutorisees: [],
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          etablissementId: securite.etablissementId,
          latitude: securite.latitude,
          longitude: securite.longitude,
          rayonMetres: securite.rayonMetres,
          blocageHorsZone: securite.blocageHorsZone,
          plagesHoraires: securite.plagesHoraires,
          ipsAutorisees: securite.ipsAutorisees,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/etablissements/:id/securite
   * Mettre à jour les paramètres de sécurité
   */
  async updateSecurite(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { latitude, longitude, rayonMetres, blocageHorsZone, plagesHoraires, ipsAutorisees } = req.body;

      const data: any = {};
      if (latitude !== undefined) data.latitude = latitude;
      if (longitude !== undefined) data.longitude = longitude;
      if (rayonMetres !== undefined) data.rayonMetres = rayonMetres;
      if (blocageHorsZone !== undefined) data.blocageHorsZone = blocageHorsZone;
      if (plagesHoraires !== undefined) data.plagesHoraires = plagesHoraires;
      if (ipsAutorisees !== undefined) data.ipsAutorisees = ipsAutorisees;

      const securite = await prisma.etablissementSecurite.upsert({
        where: { etablissementId: id },
        update: data,
        create: {
          etablissementId: id,
          ...data,
        },
      });

      res.status(200).json({
        success: true,
        data: securite,
        message: 'Paramètres de sécurité mis à jour',
      });
    } catch (error) {
      next(error);
    }
  },
};
