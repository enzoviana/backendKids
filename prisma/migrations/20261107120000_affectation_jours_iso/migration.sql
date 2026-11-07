-- Convention des jours : 1 = lundi … 7 = dimanche.
-- Les anciennes valeurs 0 (dimanche) sont converties en 7.
UPDATE "Affectation"
SET "jours" = array_replace("jours", 0, 7)
WHERE 0 = ANY("jours");
