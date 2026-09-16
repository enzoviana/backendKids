import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * POST /api/messages
 * Créer un nouveau message
 */
router.post('/', messageController.createMessage);

/**
 * GET /api/messages/recus/:userId
 * Récupérer les messages reçus par un utilisateur
 * Query params: ?includeArchive=true pour inclure les archives
 */
router.get('/recus/:userId', messageController.getMessagesRecus);

/**
 * GET /api/messages/envoyes/:userId
 * Récupérer les messages envoyés par un utilisateur
 */
router.get('/envoyes/:userId', messageController.getMessagesEnvoyes);

/**
 * GET /api/messages/unread/:userId
 * Compter les messages non lus d'un utilisateur
 */
router.get('/unread/:userId', messageController.countUnread);

/**
 * PATCH /api/messages/:id/read
 * Marquer un message comme lu
 */
router.patch('/:id/read', messageController.markAsRead);

/**
 * PATCH /api/messages/:id/archive
 * Archiver un message
 */
router.patch('/:id/archive', messageController.archiveMessage);

/**
 * DELETE /api/messages/:id
 * Supprimer un message
 */
router.delete('/:id', messageController.deleteMessage);

export default router;
