-- Migration des rôles existants vers les nouveaux rôles
-- À exécuter AVANT de changer le schéma Prisma

-- Mapper super_admin -> superadmin
UPDATE "User" SET role = 'superadmin' WHERE role = 'super_admin';

-- Mapper admin_structure -> creche
UPDATE "User" SET role = 'creche' WHERE role = 'admin_structure';

-- Mapper professionnel -> auxiliaire (ou medecin selon le cas)
-- Par défaut, on les met en auxiliaire
UPDATE "User" SET role = 'auxiliaire' WHERE role = 'professionnel';
