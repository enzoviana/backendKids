import { Router } from 'express';
import { enfantController } from '../controllers/enfantController';
import { authenticate, requireProfessional, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * POST /api/enfants
 * Créer un nouvel enfant (professionnel uniquement)
 */
router.post('/', requireProfessional, enfantController.createEnfant.bind(enfantController));

/**
 * GET /api/enfants
 * Récupérer tous les enfants (SuperAdmin uniquement)
 */
router.get('/', enfantController.getAllEnfants.bind(enfantController));

/**
 * GET /api/enfants/etablissement/:etablissementId
 * Récupérer les enfants d'un établissement
 */
router.get(
  '/etablissement/:etablissementId',
  enfantController.getEnfants.bind(enfantController)
);

/**
 * POST /api/enfants/lier-parent
 * Lier un parent à un enfant via le code confidentiel
 */
router.post('/lier-parent', enfantController.lierParent.bind(enfantController));

/**
 * GET /api/enfants/:id
 * Récupérer un enfant par ID
 */
router.get('/:id', enfantController.getEnfantById.bind(enfantController));

/**
 * PUT /api/enfants/:id
 * Mettre à jour un enfant (professionnel uniquement)
 */
router.put('/:id', requireProfessional, enfantController.updateEnfant.bind(enfantController));

/**
 * POST /api/enfants/:id/regenerer-code
 * Régénérer le code confidentiel (professionnel uniquement)
 */
router.post(
  '/:id/regenerer-code',
  requireProfessional,
  enfantController.regenererCode.bind(enfantController)
);

/**
 * DELETE /api/enfants/:id
 * Supprimer un enfant (professionnel uniquement)
 */
router.delete('/:id', requireProfessional, enfantController.deleteEnfant.bind(enfantController));

/**
 * POST /api/enfants/lier-code
 * Lier l'utilisateur connecté (parent, médecin, crèche) à un enfant grâce au code de liaison
 */
router.post('/lier-code', enfantController.lierCode.bind(enfantController));

/**
 * GET /api/enfants/:id/qrcode
 * QR code de liaison parent
 */
router.get(
  '/:id/qrcode',
  authorize(UserRole.creche, UserRole.superadmin, UserRole.developpeur),
  enfantController.getQRCode.bind(enfantController)
);

/**
 * PATCH /api/enfants/:id/dossier-medical
 * Mise à jour par le parent des infos médicales
 */
router.patch(
  '/:id/dossier-medical',
  authorize(UserRole.parent, UserRole.medecin),
  enfantController.updateDossierMedical.bind(enfantController)
);

/**
 * GET /api/enfants/:id/notes
 * Notes crèche/médecin : publiques = acteurs liés, médicales = professionnels autorisés uniquement
 */
router.get('/:id/notes', enfantController.getNotes.bind(enfantController));

/**
 * POST /api/enfants/:id/notes
 * Crèche/médecin publie une note publique ou médicale
 */
router.post(
  '/:id/notes',
  authorize(UserRole.creche, UserRole.medecin),
  enfantController.createNote.bind(enfantController)
);

/**
 * GET /api/enfants/:id/echanges-documents
 * Demandes et envois entre médecin/crèche/parents liés
 */
router.get('/:id/echanges-documents', enfantController.getEchangesDocuments.bind(enfantController));

/**
 * POST /api/enfants/:id/echanges-documents
 * Médecin demande/envoie un document à la crèche ou aux parents
 */
router.post(
  '/:id/echanges-documents',
  authorize(UserRole.creche, UserRole.medecin, UserRole.parent),
  enfantController.createEchangeDocument.bind(enfantController)
);

export default router;
