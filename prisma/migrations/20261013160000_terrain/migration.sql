ALTER TABLE "Presence" ADD COLUMN "motif" TEXT, ADD COLUMN "dateFin" TIMESTAMP(3), ADD COLUMN "auteurId" TEXT, ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Transmission" ADD COLUMN "traite" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "traiteAt" TIMESTAMP(3);
CREATE TABLE "Temperature" ("id" TEXT PRIMARY KEY, "enfantId" TEXT NOT NULL, "valeur" DOUBLE PRECISION NOT NULL, "methode" TEXT, "auteurId" TEXT, "auteurRole" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Temperature_enfantId_createdAt_idx" ON "Temperature"("enfantId","createdAt");
CREATE TABLE "Administration" ("id" TEXT PRIMARY KEY, "medicamentId" TEXT NOT NULL, "enfantId" TEXT NOT NULL, "heure" TEXT NOT NULL, "dose" TEXT, "auteurId" TEXT NOT NULL, "jour" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "Administration_medicamentId_heure_jour_key" ON "Administration"("medicamentId","heure","jour");
CREATE TABLE "Autorisation" ("id" TEXT PRIMARY KEY, "enfantId" TEXT NOT NULL, "titre" TEXT NOT NULL, "signe" BOOLEAN NOT NULL DEFAULT false, "signeParId" TEXT, "signeAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "PersonneAutorisee" ("id" TEXT PRIMARY KEY, "enfantId" TEXT NOT NULL, "nom" TEXT NOT NULL, "lien" TEXT, "telephone" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "RegistreEntree" ("id" TEXT PRIMARY KEY, "registre" TEXT NOT NULL, "etablissementId" TEXT, "texte" TEXT NOT NULL, "auteurId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
