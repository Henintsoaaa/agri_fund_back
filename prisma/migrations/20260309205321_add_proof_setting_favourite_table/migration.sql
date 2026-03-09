-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proofs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" TEXT NOT NULL DEFAULT 'Amonita',
    "platformEmail" TEXT NOT NULL DEFAULT 'contact@amonita.com',
    "minInvestment" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "maxInvestment" DOUBLE PRECISION NOT NULL DEFAULT 1000000,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enablePushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnNewProject" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnInvestment" BOOLEAN NOT NULL DEFAULT true,
    "requireTwoFactor" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- CreateIndex
CREATE INDEX "favorites_projectId_idx" ON "favorites"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_projectId_key" ON "favorites"("userId", "projectId");

-- CreateIndex
CREATE INDEX "proofs_projectId_idx" ON "proofs"("projectId");

-- CreateIndex
CREATE INDEX "proofs_status_idx" ON "proofs"("status");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
