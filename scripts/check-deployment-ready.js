#!/usr/bin/env node

/**
 * Script pour vérifier que l'application est prête pour le déploiement
 * Usage: node scripts/check-deployment-ready.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Vérification de l\'état du déploiement\n');
console.log('='.repeat(60));

const checks = [];

// Vérifier package.json
const checkPackageJson = () => {
  try {
    const pkg = require('../package.json');
    const hasStartProd = pkg.scripts['start:prod'];
    const hasBuild = pkg.scripts['build'];

    if (hasStartProd && hasBuild) {
      checks.push({ name: 'Scripts npm', status: '✅', message: 'start:prod et build présents' });
    } else {
      checks.push({ name: 'Scripts npm', status: '❌', message: 'Scripts manquants' });
    }
  } catch (err) {
    checks.push({ name: 'package.json', status: '❌', message: 'Fichier non trouvé' });
  }
};

// Vérifier railway.json
const checkRailwayConfig = () => {
  const railwayPath = path.join(__dirname, '../railway.json');
  if (fs.existsSync(railwayPath)) {
    checks.push({ name: 'railway.json', status: '✅', message: 'Fichier de config présent' });
  } else {
    checks.push({ name: 'railway.json', status: '⚠️', message: 'Fichier optionnel manquant' });
  }
};

// Vérifier .gitignore
const checkGitignore = () => {
  const gitignorePath = path.join(__dirname, '../.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (content.includes('.env') && content.includes('node_modules')) {
      checks.push({ name: '.gitignore', status: '✅', message: 'Fichiers sensibles ignorés' });
    } else {
      checks.push({ name: '.gitignore', status: '⚠️', message: 'Vérifiez les exclusions' });
    }
  } else {
    checks.push({ name: '.gitignore', status: '❌', message: 'Fichier manquant' });
  }
};

// Vérifier Prisma schema
const checkPrismaSchema = () => {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    checks.push({ name: 'Prisma schema', status: '✅', message: 'Schema présent' });
  } else {
    checks.push({ name: 'Prisma schema', status: '❌', message: 'Schema manquant' });
  }
};

// Vérifier migrations
const checkMigrations = () => {
  const migrationsPath = path.join(__dirname, '../prisma/migrations');
  if (fs.existsSync(migrationsPath)) {
    const migrations = fs.readdirSync(migrationsPath).filter(f => !f.startsWith('.'));
    if (migrations.length > 0) {
      checks.push({ name: 'Migrations', status: '✅', message: `${migrations.length} migration(s) trouvée(s)` });
    } else {
      checks.push({ name: 'Migrations', status: '⚠️', message: 'Aucune migration' });
    }
  } else {
    checks.push({ name: 'Migrations', status: '⚠️', message: 'Dossier migrations absent' });
  }
};

// Exécuter toutes les vérifications
checkPackageJson();
checkRailwayConfig();
checkGitignore();
checkPrismaSchema();
checkMigrations();

// Afficher les résultats
console.log();
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(20)} - ${check.message}`);
});

console.log('\n' + '='.repeat(60));

// Résumé
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;

if (failed > 0) {
  console.log('\n❌ Application non prête pour le déploiement');
  console.log(`   ${failed} erreur(s) à corriger\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  Application presque prête');
  console.log(`   ${warnings} avertissement(s)\n`);
} else {
  console.log('\n✅ Application prête pour le déploiement!\n');
  console.log('📝 Prochaines étapes:');
  console.log('   1. Générez des secrets JWT: node scripts/generate-secrets.js');
  console.log('   2. Commitez et pushez votre code sur GitHub');
  console.log('   3. Suivez le guide DEPLOYMENT_GUIDE.md\n');
}
