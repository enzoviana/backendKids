-- Script pour exporter les données essentielles
-- Usage: psql -h localhost -U postgres -d kidsmed_db < export-data.sql > data-export.sql

-- Désactiver les contraintes temporairement
SET session_replication_role = replica;

-- Users et Profiles
COPY (SELECT * FROM "User") TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM "Profile") TO STDOUT WITH CSV HEADER;

-- Établissements
COPY (SELECT * FROM "Etablissement") TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM "EtablissementUser") TO STDOUT WITH CSV HEADER;

-- Enfants
COPY (SELECT * FROM "Enfant") TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM "Section") TO STDOUT WITH CSV HEADER;

-- Abonnements et Tarifs
COPY (SELECT * FROM "Tarif") TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM "Abonnement") TO STDOUT WITH CSV HEADER;

-- Réactiver les contraintes
SET session_replication_role = DEFAULT;
