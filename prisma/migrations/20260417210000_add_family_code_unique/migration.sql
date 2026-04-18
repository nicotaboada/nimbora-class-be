-- AlterTable
ALTER TABLE "Family" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Family_academyId_code_key" ON "Family"("academyId", "code");
