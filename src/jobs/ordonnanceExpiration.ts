import cron from 'node-cron';
import prisma from '../config/prisma';
import { emailService } from '../services/emailService';
import { addDays, format } from 'date-fns';

/**
 * Cronjob : Rappel d'ordonnances expirantes
 * Exécuté tous les jours à 10h00
 */
export const ordonnanceExpirationJob = cron.schedule('0 10 * * *', async () => {
  console.log('\n🔔 [CRONJOB] Vérification des ordonnances expirantes...');

  try {
    const dateDebut = new Date();
    const dateFin = addDays(new Date(), 7); // Rappel 7 jours avant expiration

    const ordonnancesExpirantes = await prisma.ordonnance.findMany({
      where: {
        dateExpiration: {
          gte: dateDebut,
          lte: dateFin,
        },
        statut: 'active',
      },
    });

    // TODO: Implémenter l'envoi d'emails une fois la relation Enfant-Parent créée
    console.log('⚠️ [MOCK] Cronjob ordonnanceExpiration - Logique partielle');
    console.log(`💡 ${ordonnancesExpirantes.length} ordonnance(s) expirante(s) trouvée(s)`);
    console.log('💡 Ajoutez la relation Enfant-Parent dans le schéma Prisma pour envoyer les emails');

    // Exemple de code (une fois la relation créée) :
    /*
    let emailsSent = 0;

    for (const ordonnance of ordonnancesExpirantes) {
      const enfant = await prisma.enfant.findUnique({
        where: { id: ordonnance.enfantId },
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
      });

      if (enfant && enfant.parents.length > 0) {
        const parent = enfant.parents[0].user;

        await emailService.sendOrdonnanceExpiration(parent.email, {
          prenom: parent.profile?.prenom || 'Parent',
          nom_enfant: `${enfant.prenom} ${enfant.nom}`,
          medicament: ordonnance.medicament || 'Traitement',
          date_expiration: format(ordonnance.dateExpiration, 'dd/MM/yyyy'),
          ordonnanceId: ordonnance.id,
        });

        console.log(`✅ Email de rappel ordonnance envoyé à ${parent.email} pour ${enfant.prenom}`);
        emailsSent++;
      }
    }

    console.log(`✅ ${emailsSent} rappel(s) d'ordonnances expirantes envoyé(s)`);
    */
  } catch (error) {
    console.error('❌ Erreur lors du cronjob ordonnanceExpiration:', error);
  }
});

/**
 * Démarrer le cronjob
 */
export const startOrdonnanceExpirationJob = () => {
  ordonnanceExpirationJob.start();
  console.log('✅ Cronjob ordonnanceExpiration démarré (tous les jours à 10h00)');
};

/**
 * Arrêter le cronjob
 */
export const stopOrdonnanceExpirationJob = () => {
  ordonnanceExpirationJob.stop();
  console.log('⏹️ Cronjob ordonnanceExpiration arrêté');
};
