#!/usr/bin/env node

/**
 * Script pour générer des secrets JWT sécurisés
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Génération de secrets JWT sécurisés\n');
console.log('='.repeat(60));

const accessSecret = crypto.randomBytes(32).toString('base64');
const refreshSecret = crypto.randomBytes(32).toString('base64');

console.log('\n📋 Copiez ces valeurs dans vos variables d\'environnement:\n');

console.log('JWT_ACCESS_SECRET=' + accessSecret);
console.log('JWT_REFRESH_SECRET=' + refreshSecret);

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  IMPORTANT: Ne partagez jamais ces secrets!\n');
console.log('💡 TIP: Ces secrets doivent être différents en développement et production.\n');
