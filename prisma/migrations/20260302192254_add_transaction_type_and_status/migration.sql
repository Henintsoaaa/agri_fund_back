/*
  Warnings:

  - The `status` column on the `transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND', 'DIVIDEND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "type" "TransactionType" NOT NULL DEFAULT 'PAYMENT',
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "transaction_type_idx" ON "transaction"("type");

-- CreateIndex
CREATE INDEX "transaction_status_idx" ON "transaction"("status");
