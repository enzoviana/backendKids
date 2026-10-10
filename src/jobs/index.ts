import {
  startVaccinReminderJob,
  stopVaccinReminderJob,
} from './vaccinReminder';
import {
  startDocumentReminderJob,
  stopDocumentReminderJob,
} from './documentReminder';
import {
  startOrdonnanceExpirationJob,
  stopOrdonnanceExpirationJob,
} from './ordonnanceExpiration';

/**
 * Démarrer tous les cronjobs
 */
export const startAllJobs = () => {
  console.log('\n🚀 Démarrage des cronjobs...');

  startVaccinReminderJob();
  startDocumentReminderJob();
  startOrdonnanceExpirationJob();

  console.log('✅ Tous les cronjobs sont démarrés\n');
};

/**
 * Arrêter tous les cronjobs
 */
export const stopAllJobs = () => {
  console.log('\n⏹️ Arrêt des cronjobs...');

  stopVaccinReminderJob();
  stopDocumentReminderJob();
  stopOrdonnanceExpirationJob();

  console.log('✅ Tous les cronjobs sont arrêtés\n');
};
