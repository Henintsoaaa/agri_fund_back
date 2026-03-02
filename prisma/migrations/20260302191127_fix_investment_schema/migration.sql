/*
  Warnings:

  - You are about to drop the column `collectedAmount` on the `Project_stage` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_userId_fkey";

-- DropIndex
DROP INDEX "transaction_userId_idx";

-- AlterTable: Rename collectedAmount to currentAmount (preserve data)
ALTER TABLE "Project_stage" RENAME COLUMN "collectedAmount" TO "currentAmount";

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "userId",
ALTER COLUMN "providerTransactionId" DROP NOT NULL;
