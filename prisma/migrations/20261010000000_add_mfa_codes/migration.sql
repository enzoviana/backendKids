-- CreateTable
CREATE TABLE "MfaCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MfaCode_userId_idx" ON "MfaCode"("userId");

-- CreateIndex
CREATE INDEX "MfaCode_code_idx" ON "MfaCode"("code");

-- CreateIndex
CREATE INDEX "MfaCode_expiresAt_idx" ON "MfaCode"("expiresAt");
