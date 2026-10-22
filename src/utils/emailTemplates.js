/**
 * Email templates for Kids'Med IA
 */

export const EmailTemplate = {
  AUTH_FORGOT_PASSWORD: 'auth-forgot-password',
  AUTH_WELCOME: 'auth-welcome',
  AUTH_MFA_CODE: 'auth-mfa-code',
  RSAI_AFFECTATION: 'rsai-affectation',
  RSAI_DEMANDE: 'rsai-demande',
  RSAI_AVIS_RECU: 'rsai-avis-recu',
  MSG_NOUVEAU_MESSAGE: 'msg-nouveau-message',
  ABO_FACTURE_RECUE: 'abo-facture-recue',
  DOC_RAPPEL_VACCIN: 'doc-rappel-vaccin',
  DOC_RAPPEL_MANQUANT: 'doc-rappel-manquant',
  DOC_DEMANDE_MEDECIN: 'doc-demande-medecin',
  DOC_ORDONNANCE_EXPIRANTE: 'doc-ordonnance-expirante',
  TRANS_ALERTE_SYMPTOME: 'trans-alerte-symptome',
  SEC_ALERTE_ACCES: 'sec-alerte-acces',
};

/**
 * Render an email template with the provided data
 * @param {string} templateName - The template name
 * @param {object} data - The data to populate the template
 * @returns {string|null} - The rendered HTML or null if template not found
 */
export function renderTemplate(templateName, data) {
  // For now, return a basic HTML template
  // You can expand this to use actual template files later

  const templates = {
    'auth-forgot-password': (d) => `
      <html>
        <body>
          <h1>Réinitialisation du mot de passe</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          ${d.code ? `<p>Votre code de vérification : <strong>${d.code}</strong></p>` : ''}
          <p><a href="${d.lien_action}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
          <p>Ce lien expire dans ${d.expiration || '24 heures'}.</p>
          <p><a href="${d.lien_support}">Support</a></p>
        </body>
      </html>
    `,

    'auth-welcome': (d) => `
      <html>
        <body>
          <h1>Bienvenue sur Kids'Med IA</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Votre compte a été créé avec le rôle : ${d.role || ''}</p>
          <p><a href="${d.lien_action}">Activez votre compte</a></p>
          <p><a href="${d.lien_support}">Support</a></p>
        </body>
      </html>
    `,

    'auth-mfa-code': (d) => `
      <html>
        <body>
          <h1>Code de vérification</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Votre code de vérification : <strong>${d.code || ''}</strong></p>
          <p><a href="${d.lien_support}">Support</a></p>
        </body>
      </html>
    `,

    'rsai-affectation': (d) => `
      <html>
        <body>
          <h1>Nouvelle affectation</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>${d.nom_rsai || ''} a une nouvelle affectation à ${d.nom_creche || ''}</p>
          <p>Adresse : ${d.adresse || ''}</p>
          <p>Horaires : ${d.horaires || ''}</p>
          <p>Date de début : ${d.date_debut || ''}</p>
          <p><a href="${d.lien_action}">Voir les détails</a></p>
        </body>
      </html>
    `,

    'rsai-demande': (d) => `
      <html>
        <body>
          <h1>Nouvelle demande RSAI</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Demande pour ${d.nom_creche || ''}</p>
          <p>Motif : ${d.motif || ''}</p>
          <p>Date de début : ${d.date_debut || ''}</p>
          <p>Urgence : ${d.urgence || 'Non'}</p>
          <p><a href="${d.lien_action}">Voir la demande</a></p>
        </body>
      </html>
    `,

    'rsai-avis-recu': (d) => `
      <html>
        <body>
          <h1>Nouvel avis reçu</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>${d.nom_evaluateur || ''} vous a laissé un avis</p>
          <p>Note : ${d.note || ''}/5</p>
          <p>Commentaire : ${d.commentaire || ''}</p>
          <p><a href="${d.lien_action}">Voir l'avis</a></p>
        </body>
      </html>
    `,

    'msg-nouveau-message': (d) => `
      <html>
        <body>
          <h1>Nouveau message</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Vous avez reçu un nouveau message de ${d.expediteur || ''}</p>
          <p>Objet : ${d.objet || ''}</p>
          <p>Aperçu : ${d.apercu || ''}</p>
          <p><a href="${d.lien_action}">Lire le message</a></p>
        </body>
      </html>
    `,

    'abo-facture-recue': (d) => `
      <html>
        <body>
          <h1>Votre reçu Kids'Med IA</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Forfait : ${d.forfait || ''}</p>
          <p>Montant : ${d.montant || ''}</p>
          <p>Période : ${d.periode || ''}</p>
          <p>Numéro de facture : ${d.numero_facture || ''}</p>
          <p><a href="${d.lien_action}">Télécharger la facture</a></p>
        </body>
      </html>
    `,

    'doc-rappel-vaccin': (d) => `
      <html>
        <body>
          <h1>Rappel de vaccination</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Vaccin à prévoir pour ${d.nom_enfant || ''}</p>
          <p>Vaccin : ${d.vaccin || ''}</p>
          <p>Date prévue : ${d.date_prevue || ''}</p>
          <p><a href="${d.lien_action}">Voir le calendrier vaccinal</a></p>
        </body>
      </html>
    `,

    'doc-rappel-manquant': (d) => `
      <html>
        <body>
          <h1>Document manquant</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Document manquant pour ${d.nom_enfant || ''}</p>
          <p>Document : ${d.document_manquant || ''}</p>
          <p>Date limite : ${d.date_limite || ''}</p>
          <p><a href="${d.lien_action}">Télécharger le document</a></p>
        </body>
      </html>
    `,

    'doc-demande-medecin': (d) => `
      <html>
        <body>
          <h1>Demande de document</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Le Dr ${d.nom_medecin || ''} demande un document</p>
          <p>Document : ${d.document_demande || ''}</p>
          <p>Motif : ${d.motif || ''}</p>
          <p><a href="${d.lien_action}">Fournir le document</a></p>
        </body>
      </html>
    `,

    'doc-ordonnance-expirante': (d) => `
      <html>
        <body>
          <h1>Ordonnance expirante</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Ordonnance expirante pour ${d.nom_enfant || ''}</p>
          <p>Médicament : ${d.medicament || ''}</p>
          <p>Date d'expiration : ${d.date_expiration || ''}</p>
          <p><a href="${d.lien_action}">Renouveler l'ordonnance</a></p>
        </body>
      </html>
    `,

    'trans-alerte-symptome': (d) => `
      <html>
        <body>
          <h1>Alerte symptôme</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Information importante concernant ${d.nom_enfant || ''}</p>
          <p>Crèche : ${d.nom_creche || ''}</p>
          <p>Heure : ${d.heure || ''}</p>
          <p>Résumé : ${d.resume || ''}</p>
          <p><a href="${d.lien_action}">Voir la transmission</a></p>
        </body>
      </html>
    `,

    'sec-alerte-acces': (d) => `
      <html>
        <body>
          <h1>Alerte de sécurité</h1>
          <p>Bonjour ${d.prenom || ''},</p>
          <p>Type d'alerte : ${d.type_alerte || ''}</p>
          <p>Détails : ${d.details || ''}</p>
          <p>Date et heure : ${d.date_heure || ''}</p>
          <p>Adresse IP : ${d.ip || ''}</p>
          <p><a href="${d.lien_action}">Vérifier les paramètres</a></p>
        </body>
      </html>
    `,
  };

  const templateFn = templates[templateName];
  if (!templateFn) {
    console.warn(`Template not found: ${templateName}`);
    return null;
  }

  try {
    return templateFn(data);
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    return null;
  }
}
