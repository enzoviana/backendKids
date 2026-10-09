-- CreateEnum
CREATE TYPE "CategorieTicket" AS ENUM ('bug', 'amelioration', 'question', 'probleme_technique', 'autre');

-- CreateEnum
CREATE TYPE "PrioriteTicket" AS ENUM ('basse', 'normale', 'haute', 'critique');

-- CreateEnum
CREATE TYPE "StatutTicket" AS ENUM ('ouvert', 'en_cours', 'resolu', 'ferme');

-- CreateTable
CREATE TABLE "TicketSupport" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "auteurNom" TEXT NOT NULL,
    "auteurEmail" TEXT NOT NULL,
    "auteurRole" "UserRole" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" "CategorieTicket" NOT NULL DEFAULT 'autre',
    "priorite" "PrioriteTicket" NOT NULL DEFAULT 'normale',
    "statut" "StatutTicket" NOT NULL DEFAULT 'ouvert',
    "reponse" TEXT,
    "reponduPar" TEXT,
    "dateReponse" TIMESTAMP(3),
    "dateFermeture" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSupport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketSupport_numero_key" ON "TicketSupport"("numero");

-- CreateIndex
CREATE INDEX "TicketSupport_auteurId_idx" ON "TicketSupport"("auteurId");

-- CreateIndex
CREATE INDEX "TicketSupport_statut_idx" ON "TicketSupport"("statut");

-- CreateIndex
CREATE INDEX "TicketSupport_priorite_idx" ON "TicketSupport"("priorite");

-- CreateIndex
CREATE INDEX "TicketSupport_createdAt_idx" ON "TicketSupport"("createdAt");

-- CreateIndex
CREATE INDEX "TicketSupport_numero_idx" ON "TicketSupport"("numero");
