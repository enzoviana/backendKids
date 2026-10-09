-- CreateTable
CREATE TABLE "EtablissementSecurite" (
    "id" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rayonMetres" INTEGER NOT NULL DEFAULT 300,
    "blocageHorsZone" BOOLEAN NOT NULL DEFAULT false,
    "plagesHoraires" JSONB NOT NULL,
    "ipsAutorisees" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtablissementSecurite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtablissementSecurite_etablissementId_key" ON "EtablissementSecurite"("etablissementId");

-- CreateIndex
CREATE INDEX "EtablissementSecurite_etablissementId_idx" ON "EtablissementSecurite"("etablissementId");
