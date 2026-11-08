// Comptes de départ. Mot de passe commun : SEED_PASSWORD (défaut « KidsMed2026! »)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SECURITE } from "../src/lib/security-defaults.js";
import { ensureDefaultDocuments } from "../src/lib/documents-obligatoires.js";

const prisma = new PrismaClient();

async function main() {
  const pwd = await bcrypt.hash(process.env.SEED_PASSWORD || "KidsMed2026!", 10);
  const etab = await prisma.etablissement.upsert({
    where: { id: "seed-creche-001" },
    update: {},
    create: {
      id: "seed-creche-001",
      nom: "Les Petits Loups",
      adresse: "10 Rue de Rivoli, 75004 Paris",
      codePostal: "75004",
      ville: "Paris",
      latitude: 48.8556,
      longitude: 2.3601,
      capacite: 40,
    },
  });
  await ensureDefaultDocuments(prisma, etab.id);
  const users = [
    { email: "superadmin@kidsmed.local", role: "superadmin", prenom: "Super", nom: "Admin" },
    { email: "dev@kidsmed.local", role: "developpeur", prenom: "Dev", nom: "KidsMed" },
    { email: "directeur@petitsloups.fr", role: "creche", prenom: "Claire", nom: "Martin", etablissementId: etab.id },
    { email: "rsai@demo.com", role: "rsai", prenom: "Sophie", nom: "Durand", qualification: "Infirmière puéricultrice" },
    { email: "medecin@demo.fr", role: "medecin", prenom: "Paul", nom: "Bernard", specialite: "Pédiatrie", rpps: "10101010101" },
    { email: "parent@test.fr", role: "parent", prenom: "Julie", nom: "Petit" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, motDePasseHash: pwd, telephone: process.env.SEED_PHONE || null },
    });
  }
  const tarifs = [
    { nom: "Crèche Essentiel", roleCible: "creche", prixMensuel: 79, prixAnnuel: 790, fonctionnalites: ["Jusqu'à 30 enfants", "Transmissions", "Documents"] },
    { nom: "Crèche Premium", roleCible: "creche", prixMensuel: 149, prixAnnuel: 1490, fonctionnalites: ["Enfants illimités", "IA symptômes", "RSAI"] },
    { nom: "Médecin", roleCible: "medecin", prixMensuel: 29, prixAnnuel: 290, fonctionnalites: ["Ordonnances", "Messagerie"] },
    { nom: "RSAI", roleCible: "rsai", prixMensuel: 19, prixAnnuel: 190, fonctionnalites: ["Multi-crèches", "Géorepérage"] },
    { nom: "Parent", roleCible: "parent", prixMensuel: 0, fonctionnalites: ["Suivi quotidien", "Carnet vaccinal"] },
  ];
  if (!(await prisma.tarif.count())) await prisma.tarif.createMany({ data: tarifs });

  // Valeurs de sécurité par défaut : 08:00–20:00, rayon 50 m, géorepérage actif.
  await prisma.reglesAcces.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      plages: [],
      geofences: [],
      rayonDefaut: DEFAULT_SECURITE.rayonMetres,
      blocageDefaut: DEFAULT_SECURITE.blocageHorsZone,
      plagesDefaut: DEFAULT_SECURITE.plagesHoraires,
    },
  });
  console.log("Seed terminé.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
