import nodemailer from 'nodemailer';

/**
 * Configuration du service d'envoi d'emails
 */
export const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  mockMode: process.env.EMAIL_MOCK_MODE === 'true',

  // Configuration SMTP (Hostinger, Gmail, Outlook, etc.)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false pour port 587, true pour 465
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  },

  // Email expéditeur par défaut
  from: {
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@kidsmed.fr',
    name: process.env.SMTP_FROM_NAME || "Kids'Med IA",
  },

  // URLs du frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  urls: {
    login: process.env.FRONTEND_LOGIN_URL || 'http://localhost:3000/login',
    resetPassword: process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:3000/reset-password',
    activateAccount: process.env.FRONTEND_ACTIVATE_ACCOUNT_URL || 'http://localhost:3000/activate',
    messages: process.env.FRONTEND_MESSAGES_URL || 'http://localhost:3000/messages',
    transmissions: process.env.FRONTEND_TRANSMISSIONS_URL || 'http://localhost:3000/transmissions',
    affectations: process.env.FRONTEND_AFFECTATIONS_URL || 'http://localhost:3000/affectations',
    documents: process.env.FRONTEND_DOCUMENTS_URL || 'http://localhost:3000/documents',
    vaccins: process.env.FRONTEND_VACCINS_URL || 'http://localhost:3000/vaccins',
    ordonnances: process.env.FRONTEND_ORDONNANCES_URL || 'http://localhost:3000/ordonnances',
    factures: process.env.FRONTEND_FACTURES_URL || 'http://localhost:3000/factures',
    preferences: process.env.FRONTEND_PREFERENCES_URL || 'http://localhost:3000/preferences',
    support: process.env.FRONTEND_SUPPORT_URL || 'http://localhost:3000/support',
  },

  // Informations de l'application
  app: {
    name: process.env.APP_NAME || "Kids'Med IA",
    supportEmail: process.env.APP_SUPPORT_EMAIL || 'support@kidsmed.fr',
  },
};

/**
 * Créer un transporteur SMTP
 */
export const createSMTPTransporter = () => {
  if (emailConfig.mockMode) {
    console.log('📧 Mode MOCK activé - Les emails seront affichés dans la console');
    return null;
  }

  if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
    console.warn('⚠️ Configuration SMTP incomplète - Les emails ne seront pas envoyés');
    console.warn('💡 Configurez SMTP_USER et SMTP_PASSWORD dans votre .env');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      family: 4, // Force IPv4 pour éviter ENETUNREACH sur Render
      connectionTimeout: 10000, // 10 secondes timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: emailConfig.smtp.auth.user,
        pass: emailConfig.smtp.auth.pass,
      },
      // Options supplémentaires pour Render
      tls: {
        rejectUnauthorized: false, // Accepter les certificats auto-signés
        minVersion: 'TLSv1.2',
      },
      // Pool de connexions pour améliorer les performances
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
    });

    console.log(`✅ Transporteur SMTP configuré (${emailConfig.smtp.host}:${emailConfig.smtp.port}) - IPv4 forcé`);

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
