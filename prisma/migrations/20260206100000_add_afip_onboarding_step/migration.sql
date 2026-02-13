-- CreateEnum
CREATE TYPE "AfipOnboardingStep" AS ENUM ('FISCAL_DATA', 'DELEGATION', 'COMPLETED');

-- AlterTable: add onboardingStep with default
ALTER TABLE "AcademyAfipSettings" ADD COLUMN "onboardingStep" "AfipOnboardingStep" NOT NULL DEFAULT 'FISCAL_DATA';

-- AlterTable: set default for defaultPtoVta
ALTER TABLE "AcademyAfipSettings" ALTER COLUMN "defaultPtoVta" SET DEFAULT 1;
