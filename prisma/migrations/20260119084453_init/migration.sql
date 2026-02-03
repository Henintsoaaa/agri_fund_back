-- CreateEnum
CREATE TYPE "Project_statut" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "statut" "Project_statut" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
