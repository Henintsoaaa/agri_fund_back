/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `proofs` table. All the data in the column will be lost.
  - Added the required column `fileUrl` to the `proofs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "proofs" DROP COLUMN "imageUrl",
ADD COLUMN     "fileType" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "projectStageId" TEXT;

-- CreateIndex
CREATE INDEX "proofs_projectStageId_idx" ON "proofs"("projectStageId");

-- AddForeignKey
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_projectStageId_fkey" FOREIGN KEY ("projectStageId") REFERENCES "Project_stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
