-- ============================================================================
-- Email único per-academia (Student, Teacher, FamilyGuardian)
-- + Flatten de ContactInfo dentro de Teacher
--
-- IMPORTANTE: correr `npx ts-node scripts/find-email-collisions.ts` antes
-- de aplicar esta migración. Si hay colisiones intra-academia, limpiarlas
-- manualmente primero — el paso 5 va a fallar con constraint violation.
-- ============================================================================

-- 1. Agregar columnas de contacto flat a Teacher (nullables para no romper filas existentes)
ALTER TABLE "Teacher"
  ADD COLUMN "email"            TEXT,
  ADD COLUMN "phoneCountryCode" TEXT,
  ADD COLUMN "phoneNumber"      TEXT,
  ADD COLUMN "address"          TEXT,
  ADD COLUMN "country"          TEXT,
  ADD COLUMN "state"            TEXT,
  ADD COLUMN "city"             TEXT,
  ADD COLUMN "postalCode"       TEXT;

-- 2. Copiar data de ContactInfo a Teacher
UPDATE "Teacher" t
SET
  "email"            = c."email",
  "phoneCountryCode" = c."phoneCountryCode",
  "phoneNumber"      = c."phoneNumber",
  "address"          = c."address",
  "country"          = c."country",
  "state"            = c."state",
  "city"             = c."city",
  "postalCode"       = c."postalCode"
FROM "ContactInfo" c
WHERE c."teacherId" = t."id";

-- 3. Drop tabla ContactInfo (cascade elimina FK)
DROP TABLE "ContactInfo";

-- 4. Student: drop unique global de email (creado como UNIQUE INDEX por Prisma)
DROP INDEX IF EXISTS "Student_email_key";

-- 5. Crear uniques compuestos per-academia
CREATE UNIQUE INDEX "Student_academyId_email_key"
  ON "Student"("academyId", "email");

CREATE UNIQUE INDEX "Teacher_academyId_email_key"
  ON "Teacher"("academyId", "email");

CREATE UNIQUE INDEX "FamilyGuardian_academyId_email_key"
  ON "FamilyGuardian"("academyId", "email");
