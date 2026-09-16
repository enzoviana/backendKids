-- Étape 1: Ajouter les nouvelles valeurs d'enum

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'creche';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'medecin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'rsai';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'auxiliaire';
