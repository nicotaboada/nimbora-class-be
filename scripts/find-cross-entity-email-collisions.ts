/**
 * Reporta colisiones de email CROSS-ENTIDAD dentro de la misma academia.
 * Ejemplo: un Student y un Teacher con el mismo email en la misma academia.
 *
 * Uso: npx ts-node scripts/find-cross-entity-email-collisions.ts
 * Solo lee. No modifica datos.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  academyId: string;
  email: string;
  entities: string[];
};

async function main(): Promise<void> {
  const rows = await prisma.$queryRaw<Row[]>`
    WITH all_emails AS (
      SELECT "academyId", LOWER(email) AS email, 'Student'        AS entity, id FROM "Student"        WHERE email IS NOT NULL
      UNION ALL
      SELECT "academyId", LOWER(email) AS email, 'Teacher'        AS entity, id FROM "Teacher"        WHERE email IS NOT NULL
      UNION ALL
      SELECT "academyId", LOWER(email) AS email, 'FamilyGuardian' AS entity, id FROM "FamilyGuardian" WHERE email IS NOT NULL
    )
    SELECT "academyId", email, ARRAY_AGG(DISTINCT entity) AS entities
    FROM all_emails
    GROUP BY "academyId", email
    HAVING COUNT(DISTINCT entity) > 1
    ORDER BY "academyId", email;
  `;

  console.log("Buscando colisiones cross-entidad (Student/Teacher/Guardian) intra-academia...\n");

  if (rows.length === 0) {
    console.log("✓ Sin colisiones. El email ya es único cross-entidad en toda academia.");
    process.exit(0);
  }

  console.log(`✗ ${rows.length} email(s) aparecen en múltiples entidades dentro de la misma academia:\n`);
  for (const r of rows) {
    console.log(`  academy=${r.academyId}  email=${r.email}  entidades=[${r.entities.join(", ")}]`);
  }
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
