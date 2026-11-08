-- Dossier d'inscription : documents obligatoires par défaut pour les crèches existantes.
-- Seules les crèches qui n'ont encore aucun document obligatoire sont complétées,
-- afin de respecter les suppressions déjà faites par les administrateurs de crèche.
INSERT INTO "DocumentObligatoire" (id, "etablissementId", type, description, "validiteMois", "createdAt")
SELECT
  md5(e.id || ':' || d.type)::uuid,
  e.id,
  d.type,
  d.description,
  d.validite_mois,
  NOW()
FROM "Etablissement" e
CROSS JOIN (
  VALUES
    ('Certificat médical d''aptitude', 'Aptitude à la vie en collectivité', 12),
    ('Carnet de vaccination', 'Vaccins obligatoires à jour', 12),
    ('Justificatif de domicile', 'Justificatif de moins de 3 mois', 12),
    ('Attestation CAF', 'Attestation d''allocations familiales', 12),
    ('Autorisation de soins', 'Autorisation parentale en cas d''urgence', NULL),
    ('PAI signé (si allergie)', 'Projet d''accueil individualisé', 12)
) AS d(type, description, validite_mois)
WHERE NOT EXISTS (
  SELECT 1 FROM "DocumentObligatoire" o WHERE o."etablissementId" = e.id
);
