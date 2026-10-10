import cron from 'node-cron';
import prisma from '../config/prisma';
import { emailService } from '../services/emailService';
import { addDays, format } from 'date-fns';

/**
 * Cronjob : Rappel de documents manquants
 * Exécuté tous les lundis à 9h00
 */
export const documentReminderJob = cron.schedule('0 9 * * 1', async () => {
  console.log('\n🔔 [CRONJOB] Vérification des documents manquants...');

  try {
    // TODO: Implémenter la logique de vérification des documents
    // Pour l'instant, c'est mocké

    console.log('⚠️ [MOCK] Cronjob documentReminder - Logique non implémentée');
    console.log('💡 Implémentez la table DocumentManquant dans le schéma Prisma pour activer cette fonctionnalité');

    // Exemple de logique (une fois le modèle créé) :
    /*
    const dateLimite = addDays(new Date(), 14); // Rappel 14 jours avant la date limite

    const documentsManquants = await prisma.documentManquant.findMany({
      where: {
        dateLimite: {
          lte: dateLimite,
        },
        statut: 'manquant',
      },
      include: {
        enfant: {
          include: {
            parents: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const document of documentsManquants) {
      const enfant = document.enfant;
      const parent = enfant.parents[0]?.user;

      if (parent) {
        await emailService.sendDocumentReminder(parent.email, {
          prenom: parent.profile?.prenom || 'Parent',
          nom_enfant: `${enfant.prenom} ${enfant.nom}`,
          document_manquant: document.nom,
          date_limite: format(document.dateLimite, 'dd/MM/yyyy'),
          enfantId: enfant.id,
        });

        console.log(`✅ Email de rappel document envoyé à ${parent.email} pour ${enfant.prenom}`);
      }
    }

    console.log(`✅ ${documentsManquants.length} rappel(s) de documents envoyé(s)`);
    */
  } catch (error) {
    console.error('❌ Erreur lors du cronjob documentReminder:', error);
  }
});

/**
 * Démarrer le cronjob
 */
export const startDocumentReminderJob = () => {
  documentReminderJob.start();
  console.log('✅ Cronjob documentReminder démarré (tous les lundis à 9h00)');
};

/**
 * Arrêter le cronjob
 */
export const stopDocumentReminderJob = () => {
  documentReminderJob.stop();
  console.log('⏹️ Cronjob documentReminder arrêté');
};
