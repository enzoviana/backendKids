-- Informations de la crèche : description, horaires d'ouverture et photo.
ALTER TABLE "Etablissement" ADD COLUMN "description" TEXT;
ALTER TABLE "Etablissement" ADD COLUMN "horairesOuverture" TEXT;
ALTER TABLE "Etablissement" ADD COLUMN "photoUrl" TEXT;
