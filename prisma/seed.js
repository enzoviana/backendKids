// Comptes de départ. Mot de passe commun : SEED_PASSWORD (défaut « KidsMed2026! »)
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const pwd = await bcrypt.hash(process.env.SEED_PASSWORD || "KidsMed2026!", 10);
  const etab = await prisma.etablissement.upsert({
    where: { id: "seed-creche-001" }, update: {},
    create: { id: "seed-creche-001", nom: "Les Petits Loups", adresse: "10 Rue de Rivoli, 75004 Paris", codePostal: "75004", ville: "Paris", latitude: 48.8556, longitude: 2.3601, capacite: 40 },
  });
  const users = [
    { email: "superadmin@kidsmed.local", role: "superadmin", prenom: "Super", nom: "Admin" },
    { email: "dev@kidsmed.local", role: "developpeur", prenom: "Dev", nom: "KidsMed" },
    { email: "directeur@petitsloups.fr", role: "creche", prenom: "Claire", nom: "Martin", etablissementId: etab.id },
    { email: "rsai@demo.com", role: "rsai", prenom: "Sophie", nom: "Durand", qualification: "Infirmière puéricultrice" },
    { email: "medecin@demo.fr", role: "medecin", prenom: "Paul", nom: "Bernard", specialite: "Pédiatrie", rpps: "10101010101" },
    { email: "parent@test.fr", role: "parent", prenom: "Julie", nom: "Petit" },
  ];
  for (const u of users) await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, motDePasseHash: pwd, telephone: process.env.SEED_PHONE || null } });
  const tarifs = [
    { nom: "Crèche Essentiel", roleCible: "creche", prixMensuel: 79, prixAnnuel: 790, fonctionnalites: ["Jusqu'à 30 enfants", "Transmissions", "Documents"] },
    { nom: "Crèche Premium", roleCible: "creche", prixMensuel: 149, prixAnnuel: 1490, fonctionnalites: ["Enfants illimités", "IA symptômes", "RSAI"] },
    { nom: "Médecin", roleCible: "medecin", prixMensuel: 29, prixAnnuel: 290, fonctionnalites: ["Ordonnances", "Messagerie"] },
    { nom: "RSAI", roleCible: "rsai", prixMensuel: 19, prixAnnuel: 190, fonctionnalites: ["Multi-crèches", "Géorepérage"] },
    { nom: "Parent", roleCible: "parent", prixMensuel: 0, fonctionnalites: ["Suivi quotidien", "Carnet vaccinal"] },
  ];
  if (!(await prisma.tarif.count())) await prisma.tarif.createMany({ data: tarifs });
  console.log("Seed terminé.");
}
main().finally(() => prisma.$disconnect());
