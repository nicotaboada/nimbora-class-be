-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "academyId" TEXT;

-- Populate academyId from student.academyId for existing invoices
UPDATE "Invoice" i
SET "academyId" = s."academyId"
FROM "Student" s
WHERE i."studentId" = s.id
AND i."academyId" IS NULL;

-- For invoices without studentId (shouldn't exist yet, but just in case)
-- Set to the first academy in the system
UPDATE "Invoice"
SET "academyId" = (SELECT id FROM "Academy" LIMIT 1)
WHERE "academyId" IS NULL;

-- Make academyId NOT NULL
ALTER TABLE "Invoice" ALTER COLUMN "academyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Invoice_academyId_idx" ON "Invoice"("academyId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
