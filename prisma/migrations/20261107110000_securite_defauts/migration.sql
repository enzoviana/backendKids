-- Valeurs de sécurité par défaut (plages 08:00–20:00, rayon 50 m) et héritage par crèche.

ALTER TABLE "Etablissement" ADD COLUMN "securitePersonnalisee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Etablissement" ALTER COLUMN "rayonMetres" SET DEFAULT 50;
ALTER TABLE "Etablissement" ALTER COLUMN "blocageHorsZone" SET DEFAULT true;

-- Une crèche qui avait déjà des valeurs non standard est considérée comme personnalisée.
UPDATE "Etablissement"
SET "securitePersonnalisee" = true
WHERE "rayonMetres" <> 200
   OR "blocageHorsZone" = true
   OR "plagesHoraires" <> '[]'::jsonb;

ALTER TABLE "ReglesAcces" ADD COLUMN "rayonDefaut" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "ReglesAcces" ADD COLUMN "blocageDefaut" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ReglesAcces" ADD COLUMN "plagesDefaut" JSONB NOT NULL DEFAULT '[]';

-- Valeurs par défaut : tous les jours de 08:00 à 20:00, rayon 50 m, géorepérage actif.
INSERT INTO "ReglesAcces" ("id", "plages", "geofences", "rayonDefaut", "blocageDefaut", "plagesDefaut", "updatedAt")
VALUES (
  'global',
  '[]'::jsonb,
  '[]'::jsonb,
  50,
  true,
  '[{"jour":1,"debut":"08:00","fin":"20:00"},{"jour":2,"debut":"08:00","fin":"20:00"},{"jour":3,"debut":"08:00","fin":"20:00"},{"jour":4,"debut":"08:00","fin":"20:00"},{"jour":5,"debut":"08:00","fin":"20:00"},{"jour":6,"debut":"08:00","fin":"20:00"},{"jour":7,"debut":"08:00","fin":"20:00"}]'::jsonb,
  now()
)
ON CONFLICT ("id") DO UPDATE SET
  "rayonDefaut" = EXCLUDED."rayonDefaut",
  "blocageDefaut" = EXCLUDED."blocageDefaut",
  "plagesDefaut" = CASE
    WHEN "ReglesAcces"."plagesDefaut" = '[]'::jsonb THEN EXCLUDED."plagesDefaut"
    ELSE "ReglesAcces"."plagesDefaut"
  END,
  "updatedAt" = now();
