-- Add familyId column to Student
ALTER TABLE "Student" ADD COLUMN "familyId" TEXT;

-- Migrate data: assign each student to their family (take the most recent if multiple)
UPDATE "Student" s
SET "familyId" = fs."familyId"
FROM (
  SELECT DISTINCT ON ("studentId") "studentId", "familyId"
  FROM "FamilyStudent"
  ORDER BY "studentId", "createdAt" ASC
) fs
WHERE s."id" = fs."studentId";

-- Create index on familyId
CREATE INDEX "Student_familyId_idx" ON "Student"("familyId");

-- Add foreign key constraint
ALTER TABLE "Student" ADD CONSTRAINT "Student_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop FamilyStudent table
DROP TABLE IF EXISTS "FamilyStudent";

-- Remove familyStudents relation from Academy (already handled by dropping the table)
