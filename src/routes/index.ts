import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import enfantRoutes from './enfantRoutes';
import documentRoutes from './documentRoutes';
import notificationRoutes from './notificationRoutes';
import personnelRoutes from './personnelRoutes';
import medicamentRoutes from './medicamentRoutes';
import transmissionRoutes from './transmissionRoutes';
import sectionRoutes from './sectionRoutes';
import messageRoutes from './messageRoutes';
import ordonnanceRoutes from './ordonnanceRoutes';
import diagnosticRoutes from './diagnosticRoutes';
import abonnementRoutes from './abonnementRoutes';
import tarifRoutes from './tarifRoutes';
import logRoutes from './logRoutes';
import etablissementRoutes from './etablissementRoutes';
import documentObligatoireRoutes from './documentObligatoireRoutes';
import migrationRoutes from './migrationRoutes';

const router = Router();

/**
 * Montage des routes de l'API
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/enfants', enfantRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/personnels', personnelRoutes);
router.use('/medicaments', medicamentRoutes);
router.use('/transmissions', transmissionRoutes);
router.use('/sections', sectionRoutes);
router.use('/messages', messageRoutes);
router.use('/ordonnances', ordonnanceRoutes);
router.use('/diagnostics', diagnosticRoutes);
router.use('/abonnements', abonnementRoutes);
router.use('/tarifs', tarifRoutes);
router.use('/logs', logRoutes);
router.use('/etablissements', etablissementRoutes);
router.use('/documents-obligatoires', documentObligatoireRoutes);
router.use('/admin', migrationRoutes);

/**
 * Route de santé de l'API
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Kids\'Med IA - Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
