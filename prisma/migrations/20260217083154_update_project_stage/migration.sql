/*
  Warnings:

  - You are about to drop the column `tragetAmount` on the `Project_stage` table. All the data in the column will be lost.
  - Added the required column `image` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `Project_stage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetAmount` to the `Project_stage` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `statut` on the `Project_stage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Project_stage_statut" AS ENUM ('OPEN', 'FUNDED', 'CLOSED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "image" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project_stage" DROP COLUMN "tragetAmount",
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "targetAmount" DOUBLE PRECISION NOT NULL,
DROP COLUMN "statut",
ADD COLUMN     "statut" "Project_stage_statut" NOT NULL;
