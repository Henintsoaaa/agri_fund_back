-- CreateTable
CREATE TABLE "investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectStageId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "investmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_userId_idx" ON "investment"("userId");

-- CreateIndex
CREATE INDEX "investment_projectStageId_idx" ON "investment"("projectStageId");

-- AddForeignKey
ALTER TABLE "investment" ADD CONSTRAINT "investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment" ADD CONSTRAINT "investment_projectStageId_fkey" FOREIGN KEY ("projectStageId") REFERENCES "Project_stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
