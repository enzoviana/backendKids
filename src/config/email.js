import nodemailer from 'nodemailer';
import { cfgSync } from '../lib/runtime-config.js';

const asBool = (value) => String(value ?? '').toLowerCase() === 'true';
const noSlash = (value) => String(value ?? '').replace(/\/+$/, '');

/**
 * Configuration du service d'envoi d'e-mails.
 *
 * Toutes les propriétés sont des getters : les valeurs sont relues à chaque accès
 * depuis la configuration d'exécution (base de données puis environnement). Une
 * modification dans la console développeur est donc prise en compte immédiatement,
 * sans redémarrage.
 */
export const emailConfig = {
  /** « auto » = votre SMTP s'il est configuré, sinon SendGrid en secours. */
  get provider() {
    return cfgSync('EMAIL_PROVIDER', 'auto');
  },

  get mockMode() {
    return asBool(cfgSync('EMAIL_MOCK_MODE', 'false'));
  },

  // Configuration SendGrid (secours optionnel)
  get sendgrid() {
    return { apiKey: cfgSync('SENDGRID_API_KEY', '') };
  },

  // Configuration SMTP (serveur propre, Hostinger, OVH, Gmail, Outlook, etc.)
  get smtp() {
    const port = parseInt(cfgSync('SMTP_PORT', '587'), 10) || 587;
    return {
      host: cfgSync('SMTP_HOST', 'smtp.hostinger.com'),
      port,
      secure: asBool(cfgSync('SMTP_SECURE', String(port === 465))),
      // Vérification du certificat TLS : true par défaut. À passer à false
      // uniquement pour un serveur interne à certificat auto-signé.
      rejectUnauthorized: asBool(cfgSync('SMTP_TLS_REJECT_UNAUTHORIZED', 'true')),
      auth: {
        user: cfgSync('SMTP_USER', ''),
        pass: cfgSync('SMTP_PASSWORD', ''),
      },
    };
  },

  // E-mail expéditeur par défaut
  get from() {
    return {
      email: cfgSync('EMAIL_FROM', cfgSync('SMTP_USER', 'kidsmed-ia@datafuse.fr')),
      name: cfgSync('SMTP_FROM_NAME', "Kids'Med IA"),
    };
  },

  // URL du frontend
  get frontendUrl() {
    return noSlash(cfgSync('FRONTEND_URL', 'http://localhost:8080'));
  },

  get urls() {
    return {
      login: cfgSync('FRONTEND_LOGIN_URL', 'https://kidsmedia.vercel.app/connexion'),
      resetPassword: cfgSync('FRONTEND_RESET_PASSWORD_URL', `${this.frontendUrl}/reinitialiser`),
      activateAccount: cfgSync('FRONTEND_ACTIVATE_ACCOUNT_URL', 'http://localhost:3000/activate'),
      messages: cfgSync('FRONTEND_MESSAGES_URL', 'http://localhost:3000/messages'),
      transmissions: cfgSync('FRONTEND_TRANSMISSIONS_URL', 'http://localhost:3000/transmissions'),
      affectations: cfgSync('FRONTEND_AFFECTATIONS_URL', 'http://localhost:3000/affectations'),
      documents: cfgSync('FRONTEND_DOCUMENTS_URL', 'http://localhost:3000/documents'),
      vaccins: cfgSync('FRONTEND_VACCINS_URL', 'http://localhost:3000/vaccins'),
      ordonnances: cfgSync('FRONTEND_ORDONNANCES_URL', 'http://localhost:3000/ordonnances'),
      factures: cfgSync('FRONTEND_FACTURES_URL', 'http://localhost:3000/factures'),
      preferences: cfgSync('FRONTEND_PREFERENCES_URL', 'http://localhost:3000/preferences'),
      support: cfgSync('FRONTEND_SUPPORT_URL', 'http://localhost:3000/support'),
    };
  },

  // Informations de l'application
  get app() {
    return {
      name: cfgSync('APP_NAME', "Kids'Med IA"),
      supportEmail: cfgSync('APP_SUPPORT_EMAIL', 'support@kidsmed.fr'),
    };
  },
};

/**
 * Vérifier la configuration SendGrid
 */
export const verifySendGridConfig = () => {
  if (emailConfig.mockMode) {
    console.log('📧 Mode MOCK activé - Les emails seront affichés dans la console');
    return false;
  }

  if (!emailConfig.sendgrid.apiKey) {
    console.warn('⚠️ Configuration SendGrid incomplète - Les emails ne seront pas envoyés');
    console.warn('💡 Configurez SENDGRID_API_KEY dans votre .env ou la console développeur');
    return false;
  }

  console.log('✅ SendGrid configuré avec succès');
  return true;
};

/**
 * Créer un transporteur SMTP
 */
export const createSMTPTransporter = (overrides = {}) => {
  if (emailConfig.mockMode) {
    console.log('📧 Mode MOCK activé - Les emails seront affichés dans la console');
    return null;
  }

  // Les valeurs peuvent venir de la base (console développeur) et surcharger l'environnement.
  const host = overrides.host || emailConfig.smtp.host;
  const port = Number(overrides.port || emailConfig.smtp.port) || 587;
  const secure = overrides.secure !== undefined ? !!overrides.secure : emailConfig.smtp.secure || port === 465;
  const user = overrides.user || emailConfig.smtp.auth.user;
  const pass = overrides.pass || emailConfig.smtp.auth.pass;
  const rejectUnauthorized = overrides.rejectUnauthorized !== undefined
    ? !!overrides.rejectUnauthorized
    : emailConfig.smtp.rejectUnauthorized;

  if (!user || !pass) {
    console.warn('⚠️ Configuration SMTP incomplète - Les emails ne seront pas envoyés');
    console.warn('💡 Configurez SMTP_USER et SMTP_PASSWORD dans votre .env ou la console développeur');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout: 10000, // 10 secondes timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: { user, pass },
      // Options supplémentaires pour Render
      tls: {
        rejectUnauthorized,
        minVersion: 'TLSv1.2',
      },
      // Pool de connexions pour améliorer les performances
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      // Force IPv4 pour éviter ENETUNREACH sur Render
      dnsOptions: {
        family: 4,
      },
    });

    console.log(`✅ Transporteur SMTP configuré (${host}:${port}) - IPv4 forcé`);
    if (!rejectUnauthorized) {
      console.warn('⚠️ Vérification du certificat TLS désactivée (SMTP_TLS_REJECT_UNAUTHORIZED=false)');
    }

    // Vérifier la connexion au démarrage
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Erreur de vérification SMTP:', error.message);
        console.log('💡 Conseil: Activez EMAIL_MOCK_MODE=true si vous ne pouvez pas configurer SMTP');
      } else {
        console.log('✅ Serveur SMTP prêt à envoyer des emails');
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Erreur lors de la création du transporteur SMTP:', error);
    return null;
  }
};
