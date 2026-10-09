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
import developerRoutes from './developerRoutes';
import alerteRoutes from './alerteRoutes';
import presenceRoutes from './presenceRoutes';
import medecinRoutes from './medecinRoutes';
import rsaiRoutes from './rsaiRoutes';
import rendezVousRoutes from './rendezVousRoutes';
import parentRoutes from './parentRoutes';
import liaisonRoutes from './liaisonRoutes';
import vaccinRoutes from './vaccinRoutes';
import consentementRoutes from './consentementRoutes';
import rgpdRoutes from './rgpdRoutes';
import securiteRoutes from './securiteRoutes';
import coordinationRoutes from './coordinationRoutes';

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
router.use('/developer', developerRoutes);
router.use('/alertes', alerteRoutes);
router.use('/presences', presenceRoutes);
router.use('/medecins', medecinRoutes);
router.use('/rsai', rsaiRoutes);
router.use('/rendez-vous', rendezVousRoutes);
router.use('/parents', parentRoutes);
router.use('/liaisons', liaisonRoutes);
router.use('/vaccins', vaccinRoutes);
router.use('/consentements', consentementRoutes);
router.use('/rgpd', rgpdRoutes);
router.use('/securite', securiteRoutes);
router.use('/coordination', coordinationRoutes);

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
