-- CreateEnum
CREATE TYPE "AcademyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'STAFF', 'TEACHER', 'STUDENT');

-- CreateTable
CREATE TABLE "Academy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "AcademyStatus" NOT NULL DEFAULT 'ACTIVE',
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- AlterTable - Add academyId to Student (nullable initially for migration)
ALTER TABLE "Student" ADD COLUMN "academyId" TEXT;
ALTER TABLE "Student" ADD COLUMN "userId" TEXT;

-- AlterTable - Add academyId to Fee (nullable initially for migration)
ALTER TABLE "Fee" ADD COLUMN "academyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Academy_slug_key" ON "Academy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_academyId_idx" ON "User"("academyId");

-- CreateIndex
CREATE INDEX "Student_academyId_idx" ON "Student"("academyId");

-- CreateIndex
CREATE INDEX "Fee_academyId_idx" ON "Fee"("academyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (will be added after data migration)
-- ALTER TABLE "Student" ADD CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (optional relation)
-- ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (will be added after data migration)
-- ALTER TABLE "Fee" ADD CONSTRAINT "Fee_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE: To complete the migration:
-- 1. Create a default Academy or your first real Academy
-- 2. Update all existing Student and Fee records to point to that Academy
-- 3. Make academyId NOT NULL
-- 4. Add the foreign key constraints
-- Example SQL to run after creating an academy:
--
-- INSERT INTO "Academy" (id, name, slug, country, currency, timezone, "ownerUserId")
-- VALUES ('your-academy-id', 'Default Academy', 'default', 'AR', 'ARS', 'America/Argentina/Buenos_Aires', 'temp-owner');
--
-- UPDATE "Student" SET "academyId" = 'your-academy-id' WHERE "academyId" IS NULL;
-- UPDATE "Fee" SET "academyId" = 'your-academy-id' WHERE "academyId" IS NULL;
--
-- ALTER TABLE "Student" ALTER COLUMN "academyId" SET NOT NULL;
-- ALTER TABLE "Fee" ALTER COLUMN "academyId" SET NOT NULL;
--
-- ALTER TABLE "Student" ADD CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE "Fee" ADD CONSTRAINT "Fee_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
