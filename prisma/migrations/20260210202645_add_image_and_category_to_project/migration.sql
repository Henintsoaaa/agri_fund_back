/*
  Warnings:

  - Changed the type of `statut` on the `Project_stage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Project_stage_statut" AS ENUM ('OPEN', 'FUNDED', 'CLOSED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "category" TEXT,
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Project_stage" DROP COLUMN "statut",
ADD COLUMN     "statut" "Project_stage_statut" NOT NULL;
