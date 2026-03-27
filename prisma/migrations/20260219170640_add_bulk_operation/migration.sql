/*
  Warnings:

  - The values [DELEGATION] on the enum `AfipOnboardingStep` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `academyId` on table `Fee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `academyId` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BulkOperationType" AS ENUM ('BULK_INVOICE', 'BULK_AFIP');

-- CreateEnum
CREATE TYPE "BulkOperationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "AcademyStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
BEGIN;
CREATE TYPE "AfipOnboardingStep_new" AS ENUM ('FISCAL_DATA', 'DELEGATION_1', 'DELEGATION_2', 'COMPLETED');
ALTER TABLE "AcademyAfipSettings" ALTER COLUMN "onboardingStep" DROP DEFAULT;
ALTER TABLE "AcademyAfipSettings" ALTER COLUMN "onboardingStep" TYPE "AfipOnboardingStep_new" USING ("onboardingStep"::text::"AfipOnboardingStep_new");
ALTER TYPE "AfipOnboardingStep" RENAME TO "AfipOnboardingStep_old";
ALTER TYPE "AfipOnboardingStep_new" RENAME TO "AfipOnboardingStep";
DROP TYPE "AfipOnboardingStep_old";
ALTER TABLE "AcademyAfipSettings" ALTER COLUMN "onboardingStep" SET DEFAULT 'FISCAL_DATA';
COMMIT;

-- AlterTable
ALTER TABLE "Fee" ALTER COLUMN "academyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "academyId" SET NOT NULL;

-- CreateTable
CREATE TABLE "BulkOperation" (
    "id" TEXT NOT NULL,
    "type" "BulkOperationType" NOT NULL,
    "status" "BulkOperationStatus" NOT NULL DEFAULT 'PENDING',
    "academyId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL DEFAULT '[]',
    "params" JSONB NOT NULL,
    "triggerRunId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkOperation_academyId_idx" ON "BulkOperation"("academyId");

-- CreateIndex
CREATE INDEX "BulkOperation_status_idx" ON "BulkOperation"("status");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkOperation" ADD CONSTRAINT "BulkOperation_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
