import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Création d\'un compte RSAI de test...');

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash('rsai123', 10);

  // Créer l'utilisateur RSAI
  const rsaiUser = await prisma.user.upsert({
    where: { email: 'rsai@demo.com' },
    update: {},
    create: {
      email: 'rsai@demo.com',
      password: hashedPassword,
      role: 'rsai',
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  console.log('✅ Utilisateur RSAI créé:', rsaiUser.email);

  // Créer le profil associé
  const profile = await prisma.profile.upsert({
    where: { userId: rsaiUser.id },
    update: {},
    create: {
      userId: rsaiUser.id,
      prenom: 'Sophie',
      nom: 'Martin',
      tel: '06 12 34 56 78',
      adresse: '45 Avenue de la Santé',
      codePostal: '75014',
      ville: 'Paris',
      langue: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  console.log('✅ Profil créé pour:', profile.prenom, profile.nom);

  // Lier l'utilisateur RSAI à un établissement (test-creche-001)
  const etablissement = await prisma.etablissement.findFirst({
    where: {
      OR: [
        { id: 'test-creche-001' },
        { nom: { contains: 'Les Petits Sourires' } }
      ]
    }
  });

  if (etablissement) {
    const etablissementUser = await prisma.etablissementUser.upsert({
      where: {
        id: `${rsaiUser.id}-${etablissement.id}`,
      },
      update: {},
      create: {
        id: `${rsaiUser.id}-${etablissement.id}`,
        userId: rsaiUser.id,
        etablissementId: etablissement.id,
        poste: 'Responsable Santé et Accueil Inclusif (RSAI)',
        dateDebut: new Date(),
      },
    });

    console.log('✅ Utilisateur lié à l\'établissement:', etablissement.nom);
  } else {
    console.log('⚠️  Aucun établissement trouvé pour le lier');
  }

  console.log('\n📧 Identifiants de connexion RSAI:');
  console.log('   Email: rsai@demo.com');
  console.log('   Mot de passe: rsai123');
  console.log('\n🔐 Rôle: RSAI (Responsable Santé et Accueil Inclusif)');
  console.log('🏢 Établissement: Micro-Crèche Les Petits Sourires\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la création du compte RSAI:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
