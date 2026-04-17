/**
 * Reporta colisiones de email que impedirían aplicar los nuevos uniques
 * `@@unique([academyId, email])` en Student, Teacher y FamilyGuardian.
 *
 * Uso:
 *   npx ts-node scripts/find-email-collisions.ts
 *
 * Solo lee. No modifica datos.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Collision = {
  academyId: string;
  email: string;
  count: number;
  ids: string[];
};

async function findStudentCollisions(): Promise<Collision[]> {
  const rows = await prisma.$queryRaw<
    { academyId: string; email: string; count: bigint; ids: string[] }[]
  >`
    SELECT "academyId", email, COUNT(*)::bigint AS count, ARRAY_AGG(id) AS ids
    FROM "Student"
    WHERE email IS NOT NULL
    GROUP BY "academyId", email
    HAVING COUNT(*) > 1
  `;
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

async function findTeacherContactInfoCollisions(): Promise<Collision[]> {
  const rows = await prisma.$queryRaw<
    { academyId: string; email: string; count: bigint; ids: string[] }[]
  >`
    SELECT t."academyId", c.email, COUNT(*)::bigint AS count, ARRAY_AGG(t.id) AS ids
    FROM "ContactInfo" c
    JOIN "Teacher" t ON c."teacherId" = t.id
    WHERE c.email IS NOT NULL
    GROUP BY t."academyId", c.email
    HAVING COUNT(*) > 1
  `;
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

async function findGuardianCollisions(): Promise<Collision[]> {
  const rows = await prisma.$queryRaw<
    { academyId: string; email: string; count: bigint; ids: string[] }[]
  >`
    SELECT "academyId", email, COUNT(*)::bigint AS count, ARRAY_AGG(id) AS ids
    FROM "FamilyGuardian"
    WHERE email IS NOT NULL
    GROUP BY "academyId", email
    HAVING COUNT(*) > 1
  `;
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

async function findCrossAcademyStudentEmails(): Promise<
  { email: string; academyIds: string[] }[]
> {
  const rows = await prisma.$queryRaw<
    { email: string; academyIds: string[] }[]
  >`
    SELECT email, ARRAY_AGG(DISTINCT "academyId") AS "academyIds"
    FROM "Student"
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(DISTINCT "academyId") > 1
  `;
  return rows;
}

function printSection(title: string, collisions: Collision[]): number {
  console.log(`\n=== ${title} ===`);
  if (collisions.length === 0) {
    console.log("  OK — 0 colisiones");
    return 0;
  }
  console.log(`  ${collisions.length} colisiones encontradas:`);
  for (const c of collisions) {
    console.log(
      `  academy=${c.academyId} email=${c.email} count=${c.count} ids=[${c.ids.join(", ")}]`,
    );
  }
  return collisions.length;
}

async function main(): Promise<void> {
  console.log("Buscando colisiones de email per-academia...\n");

  const [students, teachers, guardians, crossAcademy] = await Promise.all([
    findStudentCollisions(),
    findTeacherContactInfoCollisions(),
    findGuardianCollisions(),
    findCrossAcademyStudentEmails(),
  ]);

  const blockerCount =
    printSection("Student (intra-academia)", students) +
    printSection("Teacher (intra-academia via ContactInfo)", teachers) +
    printSection("FamilyGuardian (intra-academia)", guardians);

  console.log(`\n=== Student cross-academia (informativo, NO bloquea) ===`);
  if (crossAcademy.length === 0) {
    console.log("  Ningún email se repite entre academias.");
  } else {
    console.log(
      `  ${crossAcademy.length} emails existen en múltiples academias (hoy bloqueado por unique global; OK post-migración):`,
    );
    for (const r of crossAcademy) {
      console.log(
        `  email=${r.email} academies=[${r.academyIds.join(", ")}]`,
      );
    }
  }

  console.log();
  if (blockerCount === 0) {
    console.log("✓ Sin blockers. La migración puede aplicarse.");
    process.exit(0);
  } else {
    console.log(
      `✗ ${blockerCount} colisión(es) intra-academia. Resolver antes de migrar.`,
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
