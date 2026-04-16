-- Asignar isResponsibleForBilling = true al primer tutor con emailNotifications=true y email
-- por familia. Si ninguno cumple, cae al primer tutor por createdAt.
UPDATE "FamilyGuardian" fg
SET "isResponsibleForBilling" = true
WHERE fg.id IN (
  SELECT DISTINCT ON ("familyId") id
  FROM "FamilyGuardian"
  WHERE "familyId" IS NOT NULL
  ORDER BY
    "familyId",
    -- Prioridad: tiene emailNotifications y email
    (CASE WHEN "emailNotifications" = true AND email IS NOT NULL THEN 0 ELSE 1 END),
    "createdAt" ASC
);
