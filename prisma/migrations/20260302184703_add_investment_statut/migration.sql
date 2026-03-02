/*
  Warnings:

  - Added the required column `status` to the `investment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "investment" ADD COLUMN     "status" "InvestmentStatus" NOT NULL;
