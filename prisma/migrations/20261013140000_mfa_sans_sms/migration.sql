ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT, ADD COLUMN "totpPendingSecret" TEXT, ADD COLUMN "totpLastStep" INTEGER, ADD COLUMN "webauthnChallenge" TEXT;
CREATE TABLE "Passkey" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "credentialId" TEXT NOT NULL, "publicKey" TEXT NOT NULL, "counter" INTEGER NOT NULL DEFAULT 0, "transports" TEXT[], "nom" TEXT NOT NULL DEFAULT 'Passkey', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastUsedAt" TIMESTAMP(3), CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "TrustedDevice" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "nom" TEXT NOT NULL DEFAULT 'Appareil', "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastUsedAt" TIMESTAMP(3), CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
