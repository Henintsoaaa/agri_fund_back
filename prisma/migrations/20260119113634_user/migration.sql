-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROJECT_OWNER', 'INVESTITOR', 'ADMIN');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "country" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'INVESTITOR';

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
