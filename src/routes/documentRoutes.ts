import { Router } from 'express';
import { documentController } from '../controllers/documentController';
import { authenticate, requireProfessional } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/documents/demander
 * Demander un document (professionnel uniquement)
 */
router.post(
  '/demander',
  requireProfessional,
  documentController.demanderDocument.bind(documentController)
);

/**
 * GET /api/documents/enfant/:enfantId
 * Récupérer les documents d'un enfant
 */
router.get(
  '/enfant/:enfantId',
  documentController.getDocumentsByEnfant.bind(documentController)
);

/**
 * GET /api/documents/etablissement/:etablissementId
 * Récupérer les documents d'un établissement (professionnel uniquement)
 */
router.get(
  '/etablissement/:etablissementId',
  requireProfessional,
  documentController.getDocumentsByEtablissement.bind(documentController)
);

/**
 * POST /api/documents/upload-direct
 * Upload direct d'un document avec fichier (accessible à tous)
 */
router.post(
  '/upload-direct',
  upload.single('fichier'),
  documentController.uploadDirectDocument.bind(documentController)
);

/**
 * POST /api/documents/:id/upload
 * Uploader un document (parent)
 */
router.post('/:id/upload', documentController.uploadDocument.bind(documentController));

/**
 * POST /api/documents/:id/valider
 * Valider un document (professionnel uniquement)
 */
router.post(
  '/:id/valider',
  requireProfessional,
  documentController.validerDocument.bind(documentController)
);

/**
 * POST /api/documents/:id/rejeter
 * Rejeter un document (professionnel uniquement)
 */
router.post(
  '/:id/rejeter',
  requireProfessional,
  documentController.rejeterDocument.bind(documentController)
);

/**
 * POST /api/documents/:id/relancer
 * Relancer pour un document (professionnel uniquement)
 */
router.post(
  '/:id/relancer',
  requireProfessional,
  documentController.relancerDocument.bind(documentController)
);

export default router;
