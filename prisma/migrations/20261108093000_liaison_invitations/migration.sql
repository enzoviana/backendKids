-- Invitations à s'inscrire pour les personnes liées à un enfant sans compte.
CREATE TABLE "LiaisonInvitation" (
    "id" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiaisonInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiaisonInvitation_token_key" ON "LiaisonInvitation"("token");
CREATE UNIQUE INDEX "LiaisonInvitation_enfantId_email_role_key" ON "LiaisonInvitation"("enfantId", "email", "role");
CREATE INDEX "LiaisonInvitation_email_statut_idx" ON "LiaisonInvitation"("email", "statut");
