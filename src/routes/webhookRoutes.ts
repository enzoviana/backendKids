import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Webhook Stripe pour gérer les événements de paiement
 * Note: Cette route ne doit PAS avoir de middleware authenticate
 */
router.post('/stripe', webhookController.handleStripeWebhook);

export default router;
