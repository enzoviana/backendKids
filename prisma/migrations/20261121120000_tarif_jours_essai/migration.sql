-- Période d'essai configurable par forfait (en jours, 0 = pas d'essai).
ALTER TABLE "Tarif" ADD COLUMN "joursEssai" INTEGER NOT NULL DEFAULT 0;
