-- Jeton dédié au QR d'urgence, distinct du code de liaison.
-- Le code de liaison permet de rattacher un compte au dossier : il ne doit pas
-- servir de secret imprimé sur une carte d'urgence.
ALTER TABLE "Enfant" ADD COLUMN "urgenceToken" TEXT;

UPDATE "Enfant"
SET "urgenceToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "urgenceToken" IS NULL;

CREATE UNIQUE INDEX "Enfant_urgenceToken_key" ON "Enfant"("urgenceToken");
