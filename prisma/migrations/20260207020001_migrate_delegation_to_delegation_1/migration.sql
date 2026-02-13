-- Migrate existing DELEGATION rows to DELEGATION_1
-- This migration runs after the enum values are committed
UPDATE "AcademyAfipSettings"
SET "onboardingStep" = 'DELEGATION_1'
WHERE "onboardingStep" = 'DELEGATION';
