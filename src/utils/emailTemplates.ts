import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

/**
 * Cache pour les templates compilés
 */
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Charger et compiler un template HTML
 */
export const loadTemplate = (templateName: string): HandlebarsTemplateDelegate | null => {
  try {
    // Vérifier le cache
    if (templateCache.has(templateName)) {
      return templateCache.get(templateName)!;
    }

    // Charger le fichier template
    const templatePath = path.join(__dirname, '../../Template', `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template introuvable: ${templatePath}`);
      return null;
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');

    // Compiler le template
    const template = Handlebars.compile(templateSource);

    // Mettre en cache
    templateCache.set(templateName, template);

    return template;
  } catch (error) {
    console.error(`❌ Erreur lors du chargement du template ${templateName}:`, error);
    return null;
  }
};

/**
 * Rendre un template avec des données
 */
export const renderTemplate = (templateName: string, data: any): string | null => {
  try {
    const template = loadTemplate(templateName);

    if (!template) {
      return null;
    }

    return template(data);
  } catch (error) {
    console.error(`❌ Erreur lors du rendu du template ${templateName}:`, error);
    return null;
  }
};

/**
 * Templates disponibles
 */
export enum EmailTemplate {
  AUTH_FORGOT_PASSWORD = 'auth-forgot-password',
  AUTH_WELCOME = 'auth-welcome',
  AUTH_MFA_CODE = 'auth-mfa-code',
  RSAI_AFFECTATION = 'rsai-affectation',
  RSAI_DEMANDE = 'rsai-demande',
  RSAI_AVIS_RECU = 'rsai-avis-recu',
  MSG_NOUVEAU_MESSAGE = 'msg-nouveau-message',
  ABO_FACTURE_RECUE = 'abo-facture-recue',
  DOC_RAPPEL_VACCIN = 'doc-rappel-vaccin',
  DOC_RAPPEL_MANQUANT = 'doc-rappel-manquant',
  DOC_DEMANDE_MEDECIN = 'doc-demande-medecin',
  DOC_ORDONNANCE_EXPIRANTE = 'doc-ordonnance-expirante',
  TRANS_ALERTE_SYMPTOME = 'trans-alerte-symptome',
  SEC_ALERTE_ACCES = 'sec-alerte-acces',
}
