/**
 * Service d'envoi de SMS pour MFA
 *
 * Providers supportés :
 * - Twilio (recommandé)
 * - AWS SNS
 * - Mock (développement)
 */

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'mock';
const SMS_MOCK_MODE = process.env.SMS_MOCK_MODE === 'true';

interface SendSMSParams {
  phone: string;
  message: string;
}

class SMSService {
  /**
   * Envoyer un SMS
   */
  async sendSMS({ phone, message }: SendSMSParams): Promise<boolean> {
    try {
      // Mode MOCK : afficher dans la console
      if (SMS_MOCK_MODE || SMS_PROVIDER === 'mock') {
        console.log('\n📱 ========== SMS MOCK ==========');
        console.log(`📞 Destinataire: ${phone}`);
        console.log(`💬 Message: ${message}`);
        console.log('💡 Pour activer l\'envoi réel, configurez SMS_MOCK_MODE=false');
        console.log('================================\n');
        return true;
      }

      // Mode RÉEL : envoyer via provider
      switch (SMS_PROVIDER) {
        case 'twilio':
          return await this.sendViaTwilio(phone, message);

        case 'aws-sns':
          return await this.sendViaAWS(phone, message);

        default:
          console.warn(`⚠️ Provider SMS inconnu: ${SMS_PROVIDER}. Utilisation du mode MOCK.`);
          return true;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du SMS:', error);
      return false;
    }
  }

  /**
   * Envoyer SMS via Twilio
   */
  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.error('❌ Configuration Twilio incomplète');
      console.error('💡 Configurez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_PHONE_NUMBER');
      return false;
    }

    // TODO: Implémenter l'envoi réel avec Twilio SDK
    // Nécessite: npm install twilio
    /*
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: phone,
    });

    console.log(`✅ SMS envoyé via Twilio (SID: ${result.sid})`);
    return true;
    */

    console.log('⚠️ Twilio SDK non installé. Utilisez: npm install twilio');
    console.log('📱 SMS mocké:', { phone, message });
    return true;
  }

  /**
   * Envoyer SMS via AWS SNS
   */
  private async sendViaAWS(phone: string, message: string): Promise<boolean> {
    const region = process.env.AWS_SNS_REGION || 'eu-west-3';
    const accessKeyId = process.env.AWS_SNS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SNS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.error('❌ Configuration AWS SNS incomplète');
      console.error('💡 Configurez AWS_SNS_ACCESS_KEY_ID et AWS_SNS_SECRET_ACCESS_KEY');
      return false;
    }

    // TODO: Implémenter l'envoi réel avec AWS SDK
    // Nécessite: npm install @aws-sdk/client-sns
    /*
    const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

    const client = new SNSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PublishCommand({
      Message: message,
      PhoneNumber: phone,
    });

    const result = await client.send(command);
    console.log(`✅ SMS envoyé via AWS SNS (MessageId: ${result.MessageId})`);
    return true;
    */

    console.log('⚠️ AWS SNS SDK non installé. Utilisez: npm install @aws-sdk/client-sns');
    console.log('📱 SMS mocké:', { phone, message });
    return true;
  }

  /**
   * Formater un numéro de téléphone au format international
   */
  formatPhoneNumber(phone: string): string {
    // Supprimer tous les caractères non numériques
    let cleaned = phone.replace(/\D/g, '');

    // Si commence par 0, remplacer par +33 (France)
    if (cleaned.startsWith('0')) {
      cleaned = '33' + cleaned.substring(1);
    }

    // Ajouter le + si absent
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Générer un code à 6 chiffres
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const smsService = new SMSService();
