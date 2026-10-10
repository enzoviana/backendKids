import cron from 'node-cron';
import prisma from '../config/prisma';
import { emailService } from '../services/emailService';
import { addDays, format } from 'date-fns';

/**
 * Cronjob : Rappel de vaccination
 * Exécuté tous les jours à 8h00
 */
export const vaccinReminderJob = cron.schedule('0 8 * * *', async () => {
  console.log('\n🔔 [CRONJOB] Vérification des rappels de vaccination...');

  try {
    // TODO: Implémenter la logique de vérification des vaccins
    // Pour l'instant, c'est mockė

    console.log('⚠️ [MOCK] Cronjob vaccinReminder - Logique non implémentée');
    console.log('💡 Implémentez la table Vaccin dans le schéma Prisma pour activer cette fonctionnalité');

    // Exemple de logique (une fois le modèle Vaccin créé) :
    /*
    const dateDebut = new Date();
    const dateFin = addDays(new Date(), 7); // Rappel 7 jours avant

    const vaccinsAVenir = await prisma.vaccin.findMany({
      where: {
        datePrevu: {
          gte: dateDebut,
          lte: dateFin,
        },
        statut: 'a_faire',
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

    for (const vaccin of vaccinsAVenir) {
      const enfant = vaccin.enfant;
      const parent = enfant.parents[0]?.user;

      if (parent) {
        await emailService.sendVaccinReminder(parent.email, {
          prenom: parent.profile?.prenom || 'Parent',
          nom_enfant: `${enfant.prenom} ${enfant.nom}`,
          vaccin: vaccin.nom,
          date_prevue: format(vaccin.datePrevu, 'dd/MM/yyyy'),
          enfantId: enfant.id,
        });

        console.log(`✅ Email de rappel vaccin envoyé à ${parent.email} pour ${enfant.prenom}`);
      }
    }

    console.log(`✅ ${vaccinsAVenir.length} rappel(s) de vaccination envoyé(s)`);
    */
  } catch (error) {
    console.error('❌ Erreur lors du cronjob vaccinReminder:', error);
  }
});

/**
 * Démarrer le cronjob
 */
export const startVaccinReminderJob = () => {
  vaccinReminderJob.start();
  console.log('✅ Cronjob vaccinReminder démarré (tous les jours à 8h00)');
};

/**
 * Arrêter le cronjob
 */
export const stopVaccinReminderJob = () => {
  vaccinReminderJob.stop();
  console.log('⏹️ Cronjob vaccinReminder arrêté');
};
