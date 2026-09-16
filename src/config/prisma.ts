import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Connexion à la base de données
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données PostgreSQL établie');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
};

// Déconnexion propre
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('✅ Déconnexion de la base de données');
};

export default prisma;
