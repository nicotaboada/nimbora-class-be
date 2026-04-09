-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('PADRE', 'MADRE', 'ABUELO', 'ABUELA', 'TIO', 'TIA', 'TUTOR', 'OTRO');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "Status" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyGuardian" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "email" TEXT,
    "phoneCountryCode" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'ENABLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyStudent" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Family_academyId_idx" ON "Family"("academyId");

-- CreateIndex
CREATE INDEX "Family_tags_idx" ON "Family" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "FamilyGuardian_familyId_idx" ON "FamilyGuardian"("familyId");

-- CreateIndex
CREATE INDEX "FamilyGuardian_academyId_idx" ON "FamilyGuardian"("academyId");

-- CreateIndex
CREATE INDEX "FamilyStudent_familyId_idx" ON "FamilyStudent"("familyId");

-- CreateIndex
CREATE INDEX "FamilyStudent_studentId_idx" ON "FamilyStudent"("studentId");

-- CreateIndex
CREATE INDEX "FamilyStudent_academyId_idx" ON "FamilyStudent"("academyId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyStudent_familyId_studentId_key" ON "FamilyStudent"("familyId", "studentId");

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGuardian" ADD CONSTRAINT "FamilyGuardian_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGuardian" ADD CONSTRAINT "FamilyGuardian_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStudent" ADD CONSTRAINT "FamilyStudent_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStudent" ADD CONSTRAINT "FamilyStudent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyStudent" ADD CONSTRAINT "FamilyStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
