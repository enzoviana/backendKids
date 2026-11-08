-- Copie persistante des fichiers dans PostgreSQL (le disque Render est éphémère).
CREATE TABLE "Fichier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "taille" INTEGER,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fichier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Fichier_name_key" ON "Fichier"("name");
