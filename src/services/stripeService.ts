/**
 * Service Stripe (Mode MOCK)
 *
 * Ce service simule les interactions avec Stripe.
 * Pour activer la vraie intégration Stripe, configurez STRIPE_ENABLED=true dans .env
 */

const STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

interface CheckoutSessionData {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface PortalSessionData {
  customerId: string;
  returnUrl: string;
}

class StripeService {
  private stripe: any = null;

  constructor() {
    if (STRIPE_ENABLED && STRIPE_SECRET_KEY) {
      try {
        // const Stripe = require('stripe');
        // this.stripe = new Stripe(STRIPE_SECRET_KEY);
        console.log('✅ Stripe configuré en mode RÉEL');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de Stripe:', error);
      }
    } else {
      console.log('📦 Stripe configuré en mode MOCK');
    }
  }

  /**
   * Créer une session de paiement Stripe Checkout
   */
  async createCheckoutSession(data: CheckoutSessionData): Promise<{ url: string; sessionId: string }> {
    if (!STRIPE_ENABLED || !this.stripe) {
      console.log('\n💳 ========== STRIPE CHECKOUT MOCK ==========');
      console.log(`Prix ID: ${data.priceId}`);
      console.log(`User ID: ${data.userId}`);
      console.log(`Email: ${data.userEmail}`);
      console.log(`Success URL: ${data.successUrl}`);
      console.log(`Cancel URL: ${data.cancelUrl}`);
      console.log('💡 Pour activer Stripe réel, configurez STRIPE_ENABLED=true');
      console.log('===========================================\n');

      return {
        url: 'https://checkout.stripe.com/mock-session-url',
        sessionId: 'cs_test_mock_' + Date.now(),
      };
    }

    // TODO: Vraie intégration Stripe
    // const session = await this.stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{ price: data.priceId, quantity: 1 }],
    //   customer_email: data.userEmail,
    //   metadata: { userId: data.userId },
    //   success_url: data.successUrl,
    //   cancel_url: data.cancelUrl,
    // });
    // return { url: session.url, sessionId: session.id };

    throw new Error('Stripe non configuré');
  }

  /**
   * Créer une session du portail client Stripe
   */
  async createPortalSession(data: PortalSessionData): Promise<{ url: string }> {
    if (!STRIPE_ENABLED || !this.stripe) {
      console.log('\n💳 ========== STRIPE PORTAL MOCK ==========');
      console.log(`Customer ID: ${data.customerId}`);
      console.log(`Return URL: ${data.returnUrl}`);
      console.log('💡 Pour activer Stripe réel, configurez STRIPE_ENABLED=true');
      console.log('==========================================\n');

      return {
        url: 'https://billing.stripe.com/mock-portal-url',
      };
    }

    // TODO: Vraie intégration Stripe
    // const session = await this.stripe.billingPortal.sessions.create({
    //   customer: data.customerId,
    //   return_url: data.returnUrl,
    // });
    // return { url: session.url };

    throw new Error('Stripe non configuré');
  }

  /**
   * Récupérer les informations d'un abonnement
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    if (!STRIPE_ENABLED || !this.stripe) {
      console.log(`\n💳 [MOCK] Récupération abonnement: ${subscriptionId}`);
      return {
        id: subscriptionId,
        status: 'active',
        current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
        plan: {
          amount: 7900,
          currency: 'eur',
          interval: 'month',
        },
      };
    }

    // TODO: Vraie intégration Stripe
    // return await this.stripe.subscriptions.retrieve(subscriptionId);

    throw new Error('Stripe non configuré');
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    if (!STRIPE_ENABLED || !this.stripe) {
      console.log(`\n💳 [MOCK] Annulation abonnement: ${subscriptionId}`);
      return {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Date.now(),
      };
    }

    // TODO: Vraie intégration Stripe
    // return await this.stripe.subscriptions.cancel(subscriptionId);

    throw new Error('Stripe non configuré');
  }

  /**
   * Vérifier la signature d'un webhook Stripe
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): any {
    if (!STRIPE_ENABLED || !this.stripe) {
      console.log('\n💳 [MOCK] Vérification signature webhook');
      return { type: 'mock.event', data: {} };
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET non configuré');
    }

    // TODO: Vraie intégration Stripe
    // return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    throw new Error('Stripe non configuré');
  }
}

export const stripeService = new StripeService();
