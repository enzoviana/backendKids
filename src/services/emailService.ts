import { createSMTPTransporter, emailConfig } from '../config/email';
import { renderTemplate, EmailTemplate } from '../utils/emailTemplates';
import type { Transporter } from 'nodemailer';

/**
 * Service d'envoi d'emails
 */
class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.transporter = createSMTPTransporter();
  }

  /**
   * Envoyer un email
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Mode MOCK : afficher dans la console
      if (emailConfig.mockMode || !this.transporter) {
        console.log('\n📧 ========== EMAIL MOCK ==========');
        console.log(`À: ${to}`);
        console.log(`Sujet: ${subject}`);
        console.log(`De: ${emailConfig.from.name} <${emailConfig.from.email}>`);
        console.log('HTML: [Contenu masqué - voir template]');
        console.log('====================================\n');
        return true;
      }

      // Mode RÉEL : envoyer via SMTP
      const info = await this.transporter.sendMail({
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email envoyé à ${to} (ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
      return false;
    }
  }

  /**
   * EMAIL 1: Réinitialisation du mot de passe
   */
  async sendPasswordReset(
    to: string,
    data: { prenom: string; code?: string; token: string; expiration: string }
  ): Promise<boolean> {
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
   */
  async sendWelcome(
    to: string,
    data: { prenom: string; role: string; token: string }
  ): Promise<boolean> {
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
   */
  async sendMFACode(to: string, data: { prenom: string; code: string }): Promise<boolean> {
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
   */
  async sendRsaiAffectation(
    to: string,
    data: {
      prenom: string;
      nom_rsai: string;
      nom_creche: string;
      adresse: string;
      horaires: string;
      date_debut: string;
      affectationId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendRsaiDemande(
    to: string,
    data: {
      prenom: string;
      nom_creche: string;
      motif: string;
      date_debut: string;
      urgence: boolean;
      demandeId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendRsaiAvisRecu(
    to: string,
    data: { prenom: string; nom_evaluateur: string; note: number; commentaire: string }
  ): Promise<boolean> {
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
   */
  async sendNewMessage(
    to: string,
    data: {
      prenom: string;
      expediteur: string;
      objet: string;
      apercu: string;
      messageId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendInvoiceReceipt(
    to: string,
    data: {
      prenom: string;
      forfait: string;
      montant: string;
      periode: string;
      numero_facture: string;
      invoice_url: string;
    }
  ): Promise<boolean> {
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
   */
  async sendVaccinReminder(
    to: string,
    data: {
      prenom: string;
      nom_enfant: string;
      vaccin: string;
      date_prevue: string;
      enfantId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendDocumentReminder(
    to: string,
    data: {
      prenom: string;
      nom_enfant: string;
      document_manquant: string;
      date_limite: string;
      enfantId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendDocumentRequest(
    to: string,
    data: {
      prenom: string;
      nom_medecin: string;
      document_demande: string;
      motif: string;
      enfantId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendOrdonnanceExpiration(
    to: string,
    data: {
      prenom: string;
      nom_enfant: string;
      medicament: string;
      date_expiration: string;
      ordonnanceId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendTransmissionAlert(
    to: string,
    data: {
      prenom: string;
      nom_creche: string;
      nom_enfant: string;
      heure: string;
      resume: string;
      transmissionId: string;
    }
  ): Promise<boolean> {
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
   */
  async sendSecurityAlert(
    to: string,
    data: {
      prenom: string;
      type_alerte: string;
      details: string;
      date_heure: string;
      ip: string;
    }
  ): Promise<boolean> {
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
}

export const emailService = new EmailService();
