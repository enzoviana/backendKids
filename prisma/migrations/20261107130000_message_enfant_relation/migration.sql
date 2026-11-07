-- Relation Message → Enfant pour conserver et afficher l'enfant lié au message.
-- Nettoyer les éventuels identifiants orphelins avant d'ajouter la contrainte.
UPDATE "Message"
SET "enfantId" = NULL
WHERE "enfantId" IS NOT NULL
  AND "enfantId" NOT IN (SELECT "id" FROM "Enfant");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Message_enfantId_fkey') THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_enfantId_fkey"
      FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
