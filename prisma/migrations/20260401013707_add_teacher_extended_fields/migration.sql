-- CreateEnum
CREATE TYPE "TeacherGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED');

-- CreateEnum
CREATE TYPE "TeacherDocumentType" AS ENUM ('DNI', 'PASSPORT', 'NIE', 'OTHER');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "TeacherDocumentType",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" "TeacherGender";
