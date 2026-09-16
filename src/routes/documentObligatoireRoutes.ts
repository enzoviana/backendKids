import { Router } from 'express';
import { documentObligatoireController } from '../controllers/documentObligatoireController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Routes pour la gestion des documents obligatoires personnalisés
 */

// Récupérer tous les documents obligatoires d'un établissement
router.get(
  '/etablissement/:etablissementId',
  authenticate,
  documentObligatoireController.getDocumentsObligatoiresByEtablissement
);

// Créer un document obligatoire
router.post('/', authenticate, documentObligatoireController.createDocumentObligatoire);

// Mettre à jour un document obligatoire
router.put('/:id', authenticate, documentObligatoireController.updateDocumentObligatoire);

// Désactiver un document obligatoire
router.patch(
  '/:id/deactivate',
  authenticate,
  documentObligatoireController.deactivateDocumentObligatoire
);

// Supprimer un document obligatoire
router.delete('/:id', authenticate, documentObligatoireController.deleteDocumentObligatoire);

export default router;
