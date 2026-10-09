-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('en_attente', 'acceptee', 'refusee', 'annulee');

-- CreateEnum
CREATE TYPE "StatutAffectation" AS ENUM ('active', 'terminee', 'revoquee');

-- CreateTable
CREATE TABLE "DemandeRsai" (
    "id" TEXT NOT NULL,
    "crecheId" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "urgence" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutDemande" NOT NULL DEFAULT 'en_attente',
    "traitePar" TEXT,
    "commentaire" TEXT,
    "dateTraitement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeRsai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationRsai" (
    "id" TEXT NOT NULL,
    "rsaiId" TEXT NOT NULL,
    "crecheId" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "horaires" JSONB,
    "perimetreGps" JSONB,
    "statut" "StatutAffectation" NOT NULL DEFAULT 'active',
    "creePar" TEXT NOT NULL,
    "revoqueePar" TEXT,
    "dateRevocation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffectationRsai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisRsai" (
    "id" TEXT NOT NULL,
    "rsaiId" TEXT NOT NULL,
    "crecheId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "auteurNom" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvisRsai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeRsai_crecheId_idx" ON "DemandeRsai"("crecheId");

-- CreateIndex
CREATE INDEX "DemandeRsai_etablissementId_idx" ON "DemandeRsai"("etablissementId");

-- CreateIndex
CREATE INDEX "DemandeRsai_statut_idx" ON "DemandeRsai"("statut");

-- CreateIndex
CREATE INDEX "DemandeRsai_createdAt_idx" ON "DemandeRsai"("createdAt");

-- CreateIndex
CREATE INDEX "AffectationRsai_rsaiId_idx" ON "AffectationRsai"("rsaiId");

-- CreateIndex
CREATE INDEX "AffectationRsai_crecheId_idx" ON "AffectationRsai"("crecheId");

-- CreateIndex
CREATE INDEX "AffectationRsai_etablissementId_idx" ON "AffectationRsai"("etablissementId");

-- CreateIndex
CREATE INDEX "AffectationRsai_statut_idx" ON "AffectationRsai"("statut");

-- CreateIndex
CREATE INDEX "AffectationRsai_dateDebut_idx" ON "AffectationRsai"("dateDebut");

-- CreateIndex
CREATE INDEX "AvisRsai_rsaiId_idx" ON "AvisRsai"("rsaiId");

-- CreateIndex
CREATE INDEX "AvisRsai_crecheId_idx" ON "AvisRsai"("crecheId");

-- CreateIndex
CREATE INDEX "AvisRsai_auteurId_idx" ON "AvisRsai"("auteurId");

-- CreateIndex
CREATE INDEX "AvisRsai_createdAt_idx" ON "AvisRsai"("createdAt");
