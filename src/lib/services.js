import { createSMTPTransporter, emailConfig, verifySendGridConfig } from '../config/email.js';
import { renderTemplate, EmailTemplate } from '../utils/emailTemplates.js';
import sgMail from '@sendgrid/mail';
import os from 'os';
import crypto from 'crypto';




/**
 * Service d'envoi d'emails
 */
class EmailService {
  transporter = null;
  useSendGrid = false;
  initialized = false;

  constructor() {
    // L'initialisation sera faite de manière lazy au premier envoi
    console.log('📧 EmailService créé - Configuration sera chargée au premier envoi');
  }

  /**
   * Initialise ou réinitialise le service email avec la config actuelle
   */
  async initialize() {
    // Charger la configuration depuis la DB si disponible
    const sendgridKey = await cfg('SENDGRID_API_KEY', emailConfig.sendgrid.apiKey);
    const provider = await cfg('EMAIL_PROVIDER', emailConfig.provider);
    const mockMode = emailConfig.mockMode || process.env.EMAIL_MOCK_MODE === 'true';

    // Mode MOCK activé explicitement
    if (mockMode) {
      console.log('📧 Mode MOCK activé - Les emails seront affichés dans la console');
      this.useSendGrid = false;
      this.transporter = null;
      this.initialized = true;
      return;
    }

    // Configuration du provider d'emails
    if (provider === 'sendgrid') {
      // Tenter de configurer SendGrid
      if (sendgridKey && sendgridKey.trim()) {
        this.useSendGrid = true;
        sgMail.setApiKey(sendgridKey);
        console.log('✅ SendGrid initialisé avec clé depuis DB - Les emails seront envoyés via SendGrid API');
      } else {
        // Pas d'API Key SendGrid → basculer en mode MOCK automatiquement
        console.warn('⚠️ SendGrid configuré comme provider mais SENDGRID_API_KEY manquante');
        console.warn('📧 Basculement automatique en MODE MOCK - Les emails seront affichés dans la console');
        console.warn('💡 Pour utiliser SendGrid: Configurez SENDGRID_API_KEY dans /api/developer/config');
        this.useSendGrid = false;
        this.transporter = null;
      }
    } else if (provider === 'smtp') {
      // Utiliser SMTP uniquement si explicitement demandé
      console.log('📮 SMTP configuré comme provider');
      this.transporter = createSMTPTransporter();
      this.useSendGrid = false;
    } else {
      console.warn(`⚠️ Provider email inconnu: ${provider}`);
      console.warn('📧 Basculement automatique en MODE MOCK');
      this.useSendGrid = false;
      this.transporter = null;
    }

    this.initialized = true;
  }

  /**
   * Réinitialise le service email (utile après un changement de config)
   */
  async reinitialize() {
    this.initialized = false;
    this.useSendGrid = false;
    this.transporter = null;
    await this.initialize();
  }

  /**
   * Envoyer un email
   */
  async sendEmail(to, subject, html) {
    // Initialiser le service si ce n'est pas déjà fait
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Mode MOCK : afficher dans la console (explicite ou auto si pas de provider)
      if (emailConfig.mockMode || (!this.useSendGrid && !this.transporter)) {
        console.log('\n📧 ========== EMAIL MOCK ==========');
        console.log(`À: ${to}`);
        console.log(`Sujet: ${subject}`);
        console.log(`De: ${emailConfig.from.name} <${emailConfig.from.email}>`);
        console.log('HTML: [Contenu masqué - voir template]');
        console.log('====================================\n');
        return true;
      }

      // Mode SENDGRID : envoyer via API SendGrid
      if (this.useSendGrid) {
        const msg = {
          to,
          from: {
            email: emailConfig.from.email,
            name: emailConfig.from.name,
          },
          subject,
          html,
        };

        await sgMail.send(msg);
        console.log(`✅ Email envoyé via SendGrid à ${to}`);
        return true;
      }

      // Mode SMTP : envoyer via transporteur SMTP
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
          to,
          subject,
          html,
        });

        console.log(`✅ Email envoyé via SMTP à ${to} (ID: ${info.messageId})`);
        return true;
      }

      // Fallback si aucun provider configuré
      console.error('❌ Aucun provider email configuré');
      console.log('💡 Suggestion: Configurez SENDGRID_API_KEY ou activez EMAIL_MOCK_MODE=true');
      return false;
    } catch (error) {
      // Log détaillé mais ne pas crasher
      console.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`);
      console.error(`   Provider: ${this.useSendGrid ? 'SendGrid' : 'SMTP'}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      console.error(`   Message: ${error.message || 'Unknown error'}`);

      // Suggestions selon le type d'erreur et le provider
      if (this.useSendGrid) {
        console.error('   💡 Suggestion: Vérifiez votre SENDGRID_API_KEY');
        if (error.response?.body) {
          console.error('   Détails SendGrid:', JSON.stringify(error.response.body, null, 2));
        }
      } else {
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION' || error.code === 'ESOCKET' || error.code === 'ENETUNREACH') {
          console.error('   💡 Suggestion: Utilisez SendGrid (EMAIL_PROVIDER=sendgrid) ou activez EMAIL_MOCK_MODE=true');
        } else if (error.code === 'EAUTH') {
          console.error('   💡 Suggestion: Vérifiez vos identifiants SMTP (SMTP_USER et SMTP_PASSWORD)');
        }
      }

      return false;
    }
  }

  /**
   * EMAIL 1: Réinitialisation du mot de passe
   * @param {string} to
   * @param {{ prenom: string, code?: string, token: string, expiration: string }} data
   */
  async sendPasswordReset(to, data) {
    const lien_action = `${emailConfig.urls.resetPassword}?token=${data.token}`;

    const html = renderTemplate(EmailTemplate.AUTH_FORGOT_PASSWORD, {
      prenom: data.prenom,
      code: data.code || '',
      lien_action,
      expiration: data.expiration,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template auth-forgot-password');
      return false;
    }

    return this.sendEmail(to, 'Réinitialisez votre mot de passe - Kids\'Med IA', html);
  }

  /**
   * EMAIL 2: Bienvenue (activation de compte)
   * @param {string} to
   * @param {{ prenom: string, role: string, token: string }} data
   */
  async sendWelcome(to, data) {
    const lien_action = `${emailConfig.urls.activateAccount}?token=${data.token}`;

    const html = renderTemplate(EmailTemplate.AUTH_WELCOME, {
      prenom: data.prenom,
      role: data.role,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template auth-welcome');
      return false;
    }

    return this.sendEmail(to, `Bienvenue sur ${emailConfig.app.name}`, html);
  }

  /**
   * EMAIL 3: Code MFA
   * @param {string} to
   * @param {{ prenom: string, code: string }} data
   */
  async sendMFACode(to, data) {
    const html = renderTemplate(EmailTemplate.AUTH_MFA_CODE, {
      prenom: data.prenom,
      code: data.code,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template auth-mfa-code');
      return false;
    }

    return this.sendEmail(to, 'Votre code de vérification - Kids\'Med IA', html);
  }

  /**
   * EMAIL 4: Nouvelle affectation RSAI
   * @param {string} to
   * @param {{ prenom: string, nom_rsai: string, nom_creche: string, adresse: string, horaires: string, date_debut: string, affectationId: string }} data
   */
  async sendRsaiAffectation(to, data) {
    const lien_action = `${emailConfig.urls.affectations}/${data.affectationId}`;

    const html = renderTemplate(EmailTemplate.RSAI_AFFECTATION, {
      prenom: data.prenom,
      nom_rsai: data.nom_rsai,
      nom_creche: data.nom_creche,
      adresse: data.adresse,
      horaires: data.horaires,
      date_debut: data.date_debut,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template rsai-affectation');
      return false;
    }

    return this.sendEmail(to, `Nouvelle affectation : ${data.nom_creche}`, html);
  }

  /**
   * EMAIL 5: Demande RSAI
   * @param {string} to
   * @param {{ prenom: string, nom_creche: string, motif: string, date_debut: string, urgence: boolean, demandeId: string }} data
   */
  async sendRsaiDemande(to, data) {
    const lien_action = `${emailConfig.urls.affectations}/demandes/${data.demandeId}`;

    const html = renderTemplate(EmailTemplate.RSAI_DEMANDE, {
      prenom: data.prenom,
      nom_creche: data.nom_creche,
      motif: data.motif,
      date_debut: data.date_debut,
      urgence: data.urgence ? 'Oui' : 'Non',
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template rsai-demande');
      return false;
    }

    return this.sendEmail(to, `Nouvelle demande RSAI : ${data.nom_creche}`, html);
  }

  /**
   * EMAIL 6: Avis RSAI reçu
   * @param {string} to
   * @param {{ prenom: string, nom_evaluateur: string, note: number, commentaire: string }} data
   */
  async sendRsaiAvisRecu(to, data) {
    const lien_action = emailConfig.urls.affectations;

    const html = renderTemplate(EmailTemplate.RSAI_AVIS_RECU, {
      prenom: data.prenom,
      nom_evaluateur: data.nom_evaluateur,
      note: data.note,
      commentaire: data.commentaire,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template rsai-avis-recu');
      return false;
    }

    return this.sendEmail(to, 'Vous avez reçu un nouvel avis', html);
  }

  /**
   * EMAIL 7: Nouveau message
   * @param {string} to
   * @param {{ prenom: string, expediteur: string, objet: string, apercu: string, messageId: string }} data
   */
  async sendNewMessage(to, data) {
    const lien_action = `${emailConfig.urls.messages}/${data.messageId}`;

    const html = renderTemplate(EmailTemplate.MSG_NOUVEAU_MESSAGE, {
      prenom: data.prenom,
      expediteur: data.expediteur,
      objet: data.objet,
      apercu: data.apercu,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template msg-nouveau-message');
      return false;
    }

    return this.sendEmail(to, `Nouveau message de ${data.expediteur}`, html);
  }

  /**
   * EMAIL 8: Facture reçue (Stripe)
   * @param {string} to
   * @param {{ prenom: string, forfait: string, montant: string, periode: string, numero_facture: string, invoice_url: string }} data
   */
  async sendInvoiceReceipt(to, data) {
    const html = renderTemplate(EmailTemplate.ABO_FACTURE_RECUE, {
      prenom: data.prenom,
      forfait: data.forfait,
      montant: data.montant,
      periode: data.periode,
      numero_facture: data.numero_facture,
      lien_action: data.invoice_url,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template abo-facture-recue');
      return false;
    }

    return this.sendEmail(to, `Votre reçu Kids'Med IA — ${data.forfait}`, html);
  }

  /**
   * EMAIL 9: Rappel de vaccination
   * @param {string} to
   * @param {{ prenom: string, nom_enfant: string, vaccin: string, date_prevue: string, enfantId: string }} data
   */
  async sendVaccinReminder(to, data) {
    const lien_action = `${emailConfig.urls.vaccins}/${data.enfantId}`;

    const html = renderTemplate(EmailTemplate.DOC_RAPPEL_VACCIN, {
      prenom: data.prenom,
      nom_enfant: data.nom_enfant,
      vaccin: data.vaccin,
      date_prevue: data.date_prevue,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template doc-rappel-vaccin');
      return false;
    }

    return this.sendEmail(to, `Vaccin à prévoir pour ${data.nom_enfant}`, html);
  }

  /**
   * EMAIL 10: Document manquant
   * @param {string} to
   * @param {{ prenom: string, nom_enfant: string, document_manquant: string, date_limite: string, enfantId: string }} data
   */
  async sendDocumentReminder(to, data) {
    const lien_action = `${emailConfig.urls.documents}/${data.enfantId}`;

    const html = renderTemplate(EmailTemplate.DOC_RAPPEL_MANQUANT, {
      prenom: data.prenom,
      nom_enfant: data.nom_enfant,
      document_manquant: data.document_manquant,
      date_limite: data.date_limite,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template doc-rappel-manquant');
      return false;
    }

    return this.sendEmail(to, `Document manquant pour ${data.nom_enfant}`, html);
  }

  /**
   * EMAIL 11: Demande de document par médecin
   * @param {string} to
   * @param {{ prenom: string, nom_medecin: string, document_demande: string, motif: string, enfantId: string }} data
   */
  async sendDocumentRequest(to, data) {
    const lien_action = `${emailConfig.urls.documents}/${data.enfantId}`;

    const html = renderTemplate(EmailTemplate.DOC_DEMANDE_MEDECIN, {
      prenom: data.prenom,
      nom_medecin: data.nom_medecin,
      document_demande: data.document_demande,
      motif: data.motif,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template doc-demande-medecin');
      return false;
    }

    return this.sendEmail(to, `Le Dr ${data.nom_medecin} demande un document`, html);
  }

  /**
   * EMAIL 12: Ordonnance expirante
   * @param {string} to
   * @param {{ prenom: string, nom_enfant: string, medicament: string, date_expiration: string, ordonnanceId: string }} data
   */
  async sendOrdonnanceExpiration(to, data) {
    const lien_action = `${emailConfig.urls.ordonnances}/${data.ordonnanceId}`;

    const html = renderTemplate(EmailTemplate.DOC_ORDONNANCE_EXPIRANTE, {
      prenom: data.prenom,
      nom_enfant: data.nom_enfant,
      medicament: data.medicament,
      date_expiration: data.date_expiration,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template doc-ordonnance-expirante');
      return false;
    }

    return this.sendEmail(to, `Ordonnance expirante pour ${data.nom_enfant}`, html);
  }

  /**
   * EMAIL 13: Alerte symptôme (transmission urgente)
   * @param {string} to
   * @param {{ prenom: string, nom_creche: string, nom_enfant: string, heure: string, resume: string, transmissionId: string }} data
   */
  async sendTransmissionAlert(to, data) {
    const lien_action = `${emailConfig.urls.transmissions}/${data.transmissionId}`;

    const html = renderTemplate(EmailTemplate.TRANS_ALERTE_SYMPTOME, {
      prenom: data.prenom,
      nom_creche: data.nom_creche,
      nom_enfant: data.nom_enfant,
      heure: data.heure,
      resume: data.resume,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template trans-alerte-symptome');
      return false;
    }

    return this.sendEmail(to, `Information importante concernant ${data.nom_enfant}`, html);
  }

  /**
   * EMAIL 14: Alerte accès sécurité (hors zone/horaires)
   * @param {string} to
   * @param {{ prenom: string, type_alerte: string, details: string, date_heure: string, ip: string }} data
   */
  async sendSecurityAlert(to, data) {
    const lien_action = emailConfig.urls.preferences;

    const html = renderTemplate(EmailTemplate.SEC_ALERTE_ACCES, {
      prenom: data.prenom,
      type_alerte: data.type_alerte,
      details: data.details,
      date_heure: data.date_heure,
      ip: data.ip,
      lien_action,
      lien_preferences: emailConfig.urls.preferences,
      lien_support: emailConfig.urls.support,
    });

    if (!html) {
      console.error('❌ Erreur lors du rendu du template sec-alerte-acces');
      return false;
    }

    return this.sendEmail(to, 'Alerte de sécurité - Kids\'Med IA', html);
  }

  /**
   * EMAIL 15: Création de compte avec mot de passe temporaire
   * @param {string} to
   * @param {{ prenom: string, nom: string, email: string, temporaryPassword: string, role: string }} data
   */
  async sendAccountCreated(to, data) {
    console.log('📧 EmailService.sendAccountCreated appelé:', {
      to,
      prenom: data.prenom,
      nom: data.nom,
      role: data.role,
      mockMode: emailConfig.mockMode,
      hasTransporter: !!this.transporter,
    });

    const lien_action = emailConfig.urls.login;

    // Template HTML simple pour le mot de passe temporaire
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compte créé - Kids'Med IA</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Kids'Med IA</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">Bonjour ${data.prenom} ${data.nom},</h2>

              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                Votre compte <strong>Kids'Med IA</strong> a été créé avec succès.
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #333333; font-weight: bold;">Vos identifiants de connexion :</p>
                <p style="margin: 5px 0; color: #666666;"><strong>Email :</strong> ${data.email}</p>
                <p style="margin: 5px 0; color: #666666;"><strong>Rôle :</strong> ${data.role}</p>
                <p style="margin: 5px 0; color: #666666;"><strong>Mot de passe temporaire :</strong></p>
                <div style="background-color: #fff; border: 2px dashed #667eea; padding: 15px; margin-top: 10px; text-align: center; border-radius: 4px;">
                  <code style="font-size: 18px; color: #667eea; font-weight: bold; letter-spacing: 1px;">${data.temporaryPassword}</code>
                </div>
              </div>

              <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Important :</strong> Pour votre sécurité, vous devrez changer ce mot de passe lors de votre première connexion.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${lien_action}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Se connecter maintenant
                </a>
              </div>

              <p style="color: #999999; font-size: 12px; margin: 20px 0 0 0;">
                Si vous n'avez pas demandé la création de ce compte, veuillez contacter notre support immédiatement.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Kids'Med IA - Tous droits réservés
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                <a href="${emailConfig.urls.support}" style="color: #667eea; text-decoration: none;">Support</a> •
                <a href="${emailConfig.urls.preferences}" style="color: #667eea; text-decoration: none;">Préférences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail(to, 'Votre compte Kids\'Med IA a été créé', html);
  }
}

export const emailService = new EmailService();

/**
 * Vide le cache de configuration et réinitialise les services
 * Appelé après une modification de configuration
 */
export async function clearConfigCache() {
  console.log('🔄 Réinitialisation de la configuration et des services...');

  // Réinitialiser le service email pour qu'il recharge la config
  await emailService.reinitialize();

  console.log('✅ Configuration rechargée');
}

/**
 * Wrapper function to send emails using emailService
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateOrHtml - Template name or HTML content
 * @param {object} data - Template data
 */
export async function sendEmail(to, subject, templateOrHtml, data) {
  if (data) {
    // If data is provided, assume templateOrHtml is a template name
    // Map old template names to new methods
    const templateMethods = {
      'auth-forgot-password': 'sendPasswordReset',
      'auth-welcome': 'sendWelcome',
      'auth-mfa-code': 'sendMFACode',
      'rsai-affectation': 'sendRsaiAffectation',
      'rsai-demande': 'sendRsaiDemande',
      'rsai-avis-recu': 'sendRsaiAvisRecu',
      'msg-nouveau-message': 'sendNewMessage',
      'abo-facture-recue': 'sendInvoiceReceipt',
      'doc-rappel-vaccin': 'sendVaccinReminder',
      'doc-rappel-manquant': 'sendDocumentReminder',
      'doc-demande-medecin': 'sendDocumentRequest',
      'doc-ordonnance-expirante': 'sendOrdonnanceExpiration',
      'trans-alerte-symptome': 'sendTransmissionAlert',
      'sec-alerte-acces': 'sendSecurityAlert',
    };

    const method = templateMethods[templateOrHtml];
    if (method && typeof emailService[method] === 'function') {
      return emailService[method](to, data);
    }
  }

  // If no data or template not found, use sendEmail directly
  return emailService.sendEmail(to, subject, templateOrHtml);
}

/**
 * Send SMS (mock implementation for now)
 * @param {string} phoneNumber - Phone number to send SMS to
 * @param {string} message - SMS message content
 */
export async function sendSms(phoneNumber, message) {
  console.log('\n📱 ========== SMS MOCK ==========');
  console.log(`À: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log('==================================\n');
  return true;
}

/**
 * Metrics middleware
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
}

/**
 * Génère une URL d'accès pour un fichier téléversé
 * 
 * @param {string} filename - Nom du fichier enregistré
 * @param {number} [expiresInSec=31536000] - Durée de validité en secondes (par défaut 1 ans)
 * @returns {string} URL du fichier
 */
export function signFile(filename, expiresInSec = 31536000) {
  if (!filename) return null;

  // Si c'est déjà une URL complète (ex: Cloudinary, S3, external), la retourner telle quelle
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Base URL de l'API / serveur Express (ex: https://kidsmed-backend.onrender.com ou http://localhost:5000)
  const baseUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || '';

  // Nettoyer le nom de fichier au cas où il contient un chemin relatif
  const cleanFilename = filename.split('/').pop();

  return `${baseUrl}/uploads/${cleanFilename}`;
}

/**
 * Clés de configuration disponibles
 */
export const CONFIG_KEYS = [
  'EMAIL_PROVIDER',
  'SENDGRID_API_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM',
  'GEOCODING_API_KEY',
  'MSG_MFA',
  'MSG_ALERTE_ACCES',
];

/**
 * Clés qui doivent être masquées dans les réponses API
 */
export const SECRET_KEYS = [
  'SENDGRID_API_KEY',
  'RESEND_API_KEY',
  'SMTP_PASSWORD',
  'TWILIO_AUTH_TOKEN',
  'GEOCODING_API_KEY',
];

/**
 * Configuration getter
 * @param {string} key - Configuration key
 * @param {string} defaultValue - Default value if key not found
 */
export async function cfg(key, defaultValue) {
  // Import prisma dynamically to avoid circular dependency
  const { prisma } = await import('./core.js');

  try {
    // Try to get from database first
    const entry = await prisma.configEntry.findUnique({
      where: { key }
    });

    if (entry && entry.value) {
      return entry.value;
    }
  } catch (error) {
    // If database query fails, fall back to environment variables
    console.warn(`Could not fetch config from database for key ${key}:`, error.message);
  }

  // Fall back to environment variable or default value
  return process.env[key] || defaultValue || '';
}

/**
 * Objet pour enregistrer les métriques d'appels des endpoints
 */
export const metrics = {
  perEndpoint: new Map(),
};


/**
 * Génère un instantané (snapshot) de l'état système et des métriques du serveur
 * 
 * @returns {object} Données de performance et état du serveur
 */
export function snapshot() {
  const now = Date.now();
  let totalCalls = 0;
  let totalMs = 0;
  let calls24h = 0;

  // Calculer les statistiques globales à partir des données de metrics.perEndpoint
  if (metrics && metrics.perEndpoint) {
    for (const entry of metrics.perEndpoint.values()) {
      totalCalls += entry.n;
      totalMs += entry.totalMs;
      calls24h += entry.calls.filter((t) => now - t < 864e5).length;
    }
  }

  const memoryUsage = process.memoryUsage();

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuLoad: os.loadavg(),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    },
    process: {
      memoryRssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    requests: {
      totalCalls,
      calls24h,
      avgResponseTimeMs: totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0,
      activeEndpoints: metrics?.perEndpoint?.size || 0,
    },
  };
}
const FILE_SECRET = process.env.FILE_SIGN_SECRET || process.env.JWT_SECRET || 'kidsmed-secret-key-file-signing';
/**
 * Vérifie l'authenticité et la validité temporelle d'un fichier demandé via URL signée
 * 
 * @param {string} name - Nom du fichier
 * @param {string|number} exp - Timestamp d'expiration (en secondes)
 * @param {string} sig - Signature HMAC envoyée dans la requête
 * @returns {boolean} true si le lien est valide et non expiré
 */
export function verifyFile(name, exp, sig) {
  // 1. Vérifier la présence des paramètres requis
  if (!name || !exp || !sig) {
    return false;
  }

  // 2. Vérifier l'expiration
  const now = Math.floor(Date.now() / 1000);
  if (Number(exp) < now) {
    return false;
  }

  // 3. Recalculer la signature HMAC
  const expectedSig = crypto
    .createHmac('sha256', FILE_SECRET)
    .update(`${name}:${exp}`)
    .digest('hex');

  // 4. Comparaison sécurisée contre les attaques par analyse temporelle (timing attacks)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (_e) {
    return false;
  }
}