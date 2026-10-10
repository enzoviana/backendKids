import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService';
import { emailService } from '../services/emailService';
import prisma from '../config/prisma';

/**
 * Contrôleur pour les webhooks Stripe
 */
export const webhookController = {
  /**
   * POST /api/webhooks/stripe
   * Gérer les événements Stripe
   */
  async handleStripeWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({ success: false, error: 'Signature manquante' });
      }

      // Vérifier la signature du webhook
      const event = stripeService.verifyWebhookSignature(req.body, signature);

      console.log(`📥 Webhook Stripe reçu: ${event.type}`);

      // Gérer les différents types d'événements
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          console.log(`⚠️ Type d'événement non géré: ${event.type}`);
      }

      res.status(200).json({ success: true, received: true });
    } catch (error: any) {
      console.error('❌ Erreur lors du traitement du webhook Stripe:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  },
};

/**
 * Gérer la complétion d'une session de paiement
 */
async function handleCheckoutCompleted(session: any) {
  console.log('✅ Session de paiement complétée:', session.id);

  // TODO: Créer/activer l'abonnement dans la DB
  const userId = session.metadata?.userId;

  if (userId) {
    // TODO: Ajouter les champs stripeSubscriptionId et stripeCustomerId au modèle Abonnement
    console.log('⚠️ [MOCK] Abonnement activé pour userId:', userId);
    console.log('💡 Ajoutez stripeSubscriptionId et stripeCustomerId au modèle Abonnement Prisma');
  }
}

/**
 * Gérer la création d'un abonnement
 */
async function handleSubscriptionCreated(subscription: any) {
  console.log('✅ Abonnement créé:', subscription.id);

  // TODO: Mettre à jour l'abonnement dans la DB
}

/**
 * Gérer la mise à jour d'un abonnement
 */
async function handleSubscriptionUpdated(subscription: any) {
  console.log('✅ Abonnement mis à jour:', subscription.id);

  // TODO: Mettre à jour l'abonnement dans la DB
}

/**
 * Gérer la suppression d'un abonnement
 */
async function handleSubscriptionDeleted(subscription: any) {
  console.log('⚠️ Abonnement annulé:', subscription.id);

  // TODO: Désactiver l'abonnement dans la DB
  console.log('⚠️ [MOCK] Abonnement annulé:', subscription.id);
  console.log('💡 Ajoutez stripeSubscriptionId au modèle Abonnement Prisma');
}

/**
 * Gérer le paiement d'une facture
 */
async function handleInvoicePaid(invoice: any) {
  console.log('✅ Facture payée:', invoice.id);

  // TODO: Envoyer l'email de reçu
  console.log('⚠️ [MOCK] Facture payée:', invoice.id);
  console.log('💡 Ajoutez stripeCustomerId au modèle Abonnement pour récupérer l\'utilisateur');

  // Exemple d'email (une fois le modèle mis à jour) :
  /*
  await emailService.sendInvoiceReceipt('user@example.com', {
    prenom: 'Utilisateur',
    forfait: 'Crèche Essentiel',
    montant: `${(invoice.amount_paid / 100).toFixed(2)} €`,
    periode: new Date(invoice.period_start * 1000).toLocaleDateString('fr-FR'),
    numero_facture: invoice.number || invoice.id,
    invoice_url: invoice.hosted_invoice_url || invoice.invoice_pdf || '#',
  });
  */
}

/**
 * Gérer l'échec de paiement d'une facture
 */
async function handleInvoicePaymentFailed(invoice: any) {
  console.log('❌ Échec de paiement facture:', invoice.id);

  // TODO: Notifier l'utilisateur
  // TODO: Suspendre l'abonnement si nécessaire
}
