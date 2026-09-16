#!/usr/bin/env node

/**
 * Script de migration de données entre deux bases PostgreSQL
 * Usage: node scripts/migrate-data.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Base source (locale)
const prismaSource = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Base destination (Render)
const prismaTarget = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TARGET_DATABASE_URL,
    },
  },
});

async function exportData() {
  console.log('\n📦 Export des données depuis la base source...\n');

  const data = {
    tarifs: await prismaSource.tarif.findMany(),
    users: await prismaSource.user.findMany({
      include: {
        profile: true,
        sessions: true,
      },
    }),
    etablissements: await prismaSource.etablissement.findMany({
      include: {
        sections: true,
        personnel: true,
      },
    }),
    abonnements: await prismaSource.abonnement.findMany(),
    enfants: await prismaSource.enfant.findMany({
      include: {
        section: true,
      },
    }),
  };

  console.log(`✅ ${data.tarifs.length} tarifs`);
  console.log(`✅ ${data.users.length} utilisateurs`);
  console.log(`✅ ${data.etablissements.length} établissements`);
  console.log(`✅ ${data.abonnements.length} abonnements`);
  console.log(`✅ ${data.enfants.length} enfants`);

  // Sauvegarder dans un fichier JSON
  const backupPath = path.join(__dirname, '..', 'backup-data.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

  console.log(`\n💾 Données sauvegardées dans: ${backupPath}\n`);

  return data;
}

async function importData(data) {
  console.log('\n📥 Import des données vers la base cible...\n');

  try {
    // 1. Tarifs
    console.log('⏳ Import des tarifs...');
    for (const tarif of data.tarifs) {
      const { id, createdAt, updatedAt, ...tarifData } = tarif;
      await prismaTarget.tarif.upsert({
        where: { plan: tarif.plan },
        update: tarifData,
        create: tarifData,
      });
    }
    console.log(`✅ ${data.tarifs.length} tarifs importés`);

    // 2. Utilisateurs et Profiles
    console.log('⏳ Import des utilisateurs...');
    for (const user of data.users) {
      const { profile, sessions, createdAt, updatedAt, ...userData } = user;

      await prismaTarget.user.upsert({
        where: { email: user.email },
        update: userData,
        create: userData,
      });

      // Profile
      if (profile) {
        const { id, createdAt, updatedAt, ...profileData } = profile;
        await prismaTarget.profile.upsert({
          where: { userId: profile.userId },
          update: profileData,
          create: profileData,
        });
      }
    }
    console.log(`✅ ${data.users.length} utilisateurs importés`);

    // 3. Établissements
    console.log('⏳ Import des établissements...');
    for (const etab of data.etablissements) {
      const { sections, personnel, createdAt, updatedAt, ...etabData } = etab;

      await prismaTarget.etablissement.upsert({
        where: { id: etab.id },
        update: etabData,
        create: etabData,
      });

      // Sections
      for (const section of sections || []) {
        const { createdAt, updatedAt, ...sectionData } = section;
        await prismaTarget.section.upsert({
          where: { id: section.id },
          update: sectionData,
          create: sectionData,
        });
      }

      // Personnel
      for (const person of personnel || []) {
        const { createdAt, updatedAt, ...personData } = person;
        await prismaTarget.personnel.upsert({
          where: { id: person.id },
          update: personData,
          create: personData,
        });
      }
    }
    console.log(`✅ ${data.etablissements.length} établissements importés`);

    // 4. Abonnements
    console.log('⏳ Import des abonnements...');
    for (const abo of data.abonnements) {
      const { createdAt, updatedAt, ...aboData } = abo;
      await prismaTarget.abonnement.upsert({
        where: { id: abo.id },
        update: aboData,
        create: aboData,
      });
    }
    console.log(`✅ ${data.abonnements.length} abonnements importés`);

    // 5. Enfants
    console.log('⏳ Import des enfants...');
    for (const enfant of data.enfants) {
      const { section, createdAt, updatedAt, ...enfantData } = enfant;
      await prismaTarget.enfant.upsert({
        where: { id: enfant.id },
        update: enfantData,
        create: enfantData,
      });
    }
    console.log(`✅ ${data.enfants.length} enfants importés`);

    console.log('\n✨ Migration terminée avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Script de migration de données\n');
  console.log('='.repeat(60));

  if (!process.env.TARGET_DATABASE_URL) {
    console.error('\n❌ Erreur: TARGET_DATABASE_URL non défini');
    console.log('\nUsage:');
    console.log('  SOURCE_DATABASE_URL="postgresql://local..." \\');
    console.log('  TARGET_DATABASE_URL="postgresql://render..." \\');
    console.log('  node scripts/migrate-data.js\n');
    process.exit(1);
  }

  console.log('📊 Base source:', process.env.SOURCE_DATABASE_URL?.substring(0, 50) + '...');
  console.log('🎯 Base cible:', process.env.TARGET_DATABASE_URL?.substring(0, 50) + '...\n');
  console.log('='.repeat(60));

  try {
    // Export
    const data = await exportData();

    // Import
    await importData(data);

    console.log('='.repeat(60));
    console.log('\n🎉 Migration réussie!\n');
    console.log('Prochaines étapes:');
    console.log('  1. Vérifiez les données sur Render');
    console.log('  2. Testez la connexion');
    console.log('  3. Supprimez le fichier backup-data.json si tout est OK\n');

  } catch (error) {
    console.error('\n💥 Échec de la migration:', error);
    process.exit(1);
  } finally {
    await prismaSource.$disconnect();
    await prismaTarget.$disconnect();
  }
}

main();
