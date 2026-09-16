#!/usr/bin/env node

/**
 * Script simple de migration de données entre deux bases PostgreSQL
 * Usage: node scripts/migrate-simple.js
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function formatUrl(url) {
  if (!url) return 'Non définie';
  const parsed = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
  if (parsed) {
    return `postgresql://${parsed[1]}:****@${parsed[3]}/${parsed[4]}`;
  }
  return url.substring(0, 50) + '...';
}

async function connectDatabase(url, label) {
  try {
    console.log(`\n⏳ Connexion à ${label}...`);
    const prisma = new PrismaClient({
      datasources: { db: { url } },
    });
    await prisma.$connect();
    console.log(`✅ Connecté à ${label}`);
    return prisma;
  } catch (error) {
    console.error(`❌ Erreur de connexion à ${label}:`, error.message);
    throw error;
  }
}

async function exportData(prisma) {
  console.log('\n📦 Export des données...\n');

  const data = {};
  const stats = {};

  try {
    // Tarifs
    process.stdout.write('   Tarifs... ');
    data.tarifs = await prisma.tarif.findMany();
    stats.tarifs = data.tarifs.length;
    console.log(`✅ ${stats.tarifs}`);

    // Users avec profiles
    process.stdout.write('   Users... ');
    data.users = await prisma.user.findMany({
      include: { profile: true },
    });
    stats.users = data.users.length;
    console.log(`✅ ${stats.users}`);

    // Établissements avec sections et personnel
    process.stdout.write('   Établissements... ');
    data.etablissements = await prisma.etablissement.findMany({
      include: {
        sections: true,
        personnels: true,
      },
    });
    stats.etablissements = data.etablissements.length;
    console.log(`✅ ${stats.etablissements}`);

    // Abonnements
    process.stdout.write('   Abonnements... ');
    data.abonnements = await prisma.abonnement.findMany();
    stats.abonnements = data.abonnements.length;
    console.log(`✅ ${stats.abonnements}`);

    // Enfants
    process.stdout.write('   Enfants... ');
    data.enfants = await prisma.enfant.findMany();
    stats.enfants = data.enfants.length;
    console.log(`✅ ${stats.enfants}`);

    // Documents
    process.stdout.write('   Documents... ');
    data.documents = await prisma.document.findMany();
    stats.documents = data.documents.length;
    console.log(`✅ ${stats.documents}`);

    console.log('\n📊 Résumé de l\'export:');
    console.log(`   • ${stats.tarifs} tarifs`);
    console.log(`   • ${stats.users} utilisateurs`);
    console.log(`   • ${stats.etablissements} établissements`);
    console.log(`   • ${stats.abonnements} abonnements`);
    console.log(`   • ${stats.enfants} enfants`);
    console.log(`   • ${stats.documents} documents`);

    return { data, stats };
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'export:', error.message);
    throw error;
  }
}

async function importData(prisma, data, stats) {
  console.log('\n📥 Import des données...\n');

  const imported = {
    tarifs: 0,
    users: 0,
    profiles: 0,
    etablissements: 0,
    sections: 0,
    personnel: 0,
    abonnements: 0,
    enfants: 0,
    documents: 0,
  };

  try {
    // 1. Tarifs
    process.stdout.write(`   Tarifs (${stats.tarifs})... `);
    for (const tarif of data.tarifs) {
      const { id, createdAt, updatedAt, ...tarifData } = tarif;
      try {
        await prisma.tarif.upsert({
          where: { plan: tarif.plan },
          update: tarifData,
          create: tarifData,
        });
        imported.tarifs++;
      } catch (err) {
        console.log(`\n   ⚠️ Tarif ${tarif.plan} déjà existant, ignoré`);
      }
    }
    console.log(`✅ ${imported.tarifs}`);

    // 2. Users et Profiles
    process.stdout.write(`   Users (${stats.users})... `);
    for (const user of data.users) {
      const { profile, createdAt, updatedAt, lastLoginAt, ...userData } = user;

      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            ...userData,
            lastLoginAt: lastLoginAt ? new Date(lastLoginAt) : null,
          },
          create: {
            ...userData,
            lastLoginAt: lastLoginAt ? new Date(lastLoginAt) : null,
          },
        });
        imported.users++;

        // Profile
        if (profile) {
          const { id, createdAt, updatedAt, ...profileData } = profile;
          try {
            await prisma.profile.upsert({
              where: { userId: profile.userId },
              update: profileData,
              create: profileData,
            });
            imported.profiles++;
          } catch (err) {
            // Profile existe déjà
          }
        }
      } catch (err) {
        console.log(`\n   ⚠️ User ${user.email} erreur:`, err.message);
      }
    }
    console.log(`✅ ${imported.users} users, ${imported.profiles} profiles`);

    // 3. Établissements
    process.stdout.write(`   Établissements (${stats.etablissements})... `);
    for (const etab of data.etablissements) {
      const { sections, personnels, createdAt, updatedAt, ...etabData } = etab;

      try {
        await prisma.etablissement.upsert({
          where: { id: etab.id },
          update: etabData,
          create: etabData,
        });
        imported.etablissements++;

        // Sections
        for (const section of sections || []) {
          const { createdAt, updatedAt, ...sectionData } = section;
          try {
            await prisma.section.upsert({
              where: { id: section.id },
              update: sectionData,
              create: sectionData,
            });
            imported.sections++;
          } catch (err) {
            // Section existe
          }
        }

        // Personnel
        for (const person of personnels || []) {
          const { createdAt, updatedAt, ...personData } = person;
          try {
            await prisma.personnel.upsert({
              where: { id: person.id },
              update: personData,
              create: personData,
            });
            imported.personnel++;
          } catch (err) {
            // Personnel existe
          }
        }
      } catch (err) {
        console.log(`\n   ⚠️ Établissement ${etab.nom} erreur:`, err.message);
      }
    }
    console.log(`✅ ${imported.etablissements} établissements, ${imported.sections} sections, ${imported.personnel} personnel`);

    // 4. Abonnements
    process.stdout.write(`   Abonnements (${stats.abonnements})... `);
    for (const abo of data.abonnements) {
      const { createdAt, updatedAt, ...aboData } = abo;
      try {
        await prisma.abonnement.upsert({
          where: { id: abo.id },
          update: aboData,
          create: aboData,
        });
        imported.abonnements++;
      } catch (err) {
        console.log(`\n   ⚠️ Abonnement ${abo.id} erreur:`, err.message);
      }
    }
    console.log(`✅ ${imported.abonnements}`);

    // 5. Enfants
    process.stdout.write(`   Enfants (${stats.enfants})... `);
    for (const enfant of data.enfants) {
      const { createdAt, updatedAt, ...enfantData } = enfant;
      try {
        await prisma.enfant.upsert({
          where: { id: enfant.id },
          update: {
            ...enfantData,
            dateNaissance: new Date(enfantData.dateNaissance),
            codeGenereLe: enfantData.codeGenereLe ? new Date(enfantData.codeGenereLe) : null,
          },
          create: {
            ...enfantData,
            dateNaissance: new Date(enfantData.dateNaissance),
            codeGenereLe: enfantData.codeGenereLe ? new Date(enfantData.codeGenereLe) : null,
          },
        });
        imported.enfants++;
      } catch (err) {
        console.log(`\n   ⚠️ Enfant ${enfant.prenom} ${enfant.nom} erreur:`, err.message);
      }
    }
    console.log(`✅ ${imported.enfants}`);

    // 6. Documents
    process.stdout.write(`   Documents (${stats.documents})... `);
    for (const doc of data.documents) {
      const { createdAt, updatedAt, ...docData } = doc;
      try {
        await prisma.document.upsert({
          where: { id: doc.id },
          update: {
            ...docData,
            dateEmission: docData.dateEmission ? new Date(docData.dateEmission) : null,
            dateExpiration: docData.dateExpiration ? new Date(docData.dateExpiration) : null,
          },
          create: {
            ...docData,
            dateEmission: docData.dateEmission ? new Date(docData.dateEmission) : null,
            dateExpiration: docData.dateExpiration ? new Date(docData.dateExpiration) : null,
          },
        });
        imported.documents++;
      } catch (err) {
        // Document existe
      }
    }
    console.log(`✅ ${imported.documents}`);

    console.log('\n✨ Import terminé!\n');
    console.log('📊 Résumé de l\'import:');
    console.log(`   • ${imported.tarifs}/${stats.tarifs} tarifs`);
    console.log(`   • ${imported.users}/${stats.users} utilisateurs`);
    console.log(`   • ${imported.profiles}/${stats.users} profiles`);
    console.log(`   • ${imported.etablissements}/${stats.etablissements} établissements`);
    console.log(`   • ${imported.sections} sections`);
    console.log(`   • ${imported.personnel} personnel`);
    console.log(`   • ${imported.abonnements}/${stats.abonnements} abonnements`);
    console.log(`   • ${imported.enfants}/${stats.enfants} enfants`);
    console.log(`   • ${imported.documents}/${stats.documents} documents`);

    return imported;
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Script de Migration de Données\n');
  console.log('═'.repeat(60));

  try {
    // 1. Configuration
    let sourceUrl = process.env.SOURCE_DATABASE_URL;
    let targetUrl = process.env.TARGET_DATABASE_URL;

    if (!sourceUrl) {
      sourceUrl = await question('\n📍 URL de la base SOURCE (locale): ');
      if (!sourceUrl.trim()) {
        sourceUrl = 'postgresql://postgres:postgres@localhost:5432/kidsmed_db';
        console.log(`   Utilisation par défaut: ${formatUrl(sourceUrl)}`);
      }
    }

    if (!targetUrl) {
      targetUrl = await question('🎯 URL de la base CIBLE (Render): ');
      if (!targetUrl.trim()) {
        console.error('\n❌ URL cible requise!');
        process.exit(1);
      }
    }

    console.log('\n📋 Configuration:');
    console.log(`   Source: ${formatUrl(sourceUrl)}`);
    console.log(`   Cible:  ${formatUrl(targetUrl)}`);

    // 2. Confirmation
    const confirm = await question('\n⚠️  Continuer la migration? (oui/non): ');
    if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o' && confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration annulée');
      process.exit(0);
    }

    console.log('\n' + '═'.repeat(60));

    // 3. Connexion aux bases
    const prismaSource = await connectDatabase(sourceUrl, 'base source');
    const prismaTarget = await connectDatabase(targetUrl, 'base cible');

    // 4. Export
    const { data, stats } = await exportData(prismaSource);

    // 5. Import
    const imported = await importData(prismaTarget, data, stats);

    // 6. Nettoyage
    await prismaSource.$disconnect();
    await prismaTarget.$disconnect();

    console.log('\n' + '═'.repeat(60));
    console.log('\n🎉 Migration terminée avec succès!\n');

  } catch (error) {
    console.error('\n💥 Erreur:', error.message);
    console.error('\nVérifiez:');
    console.error('  • Les URLs de connexion sont correctes');
    console.error('  • Les bases de données sont accessibles');
    console.error('  • Les migrations sont appliquées sur la cible');
    console.error('\nPour appliquer les migrations sur la cible:');
    console.error('  DATABASE_URL="postgresql://..." npx prisma migrate deploy\n');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Lancer le script
main();
