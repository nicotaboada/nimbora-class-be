import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "src/prisma/prisma.service";

export type EmailOwnerEntity = "student" | "teacher" | "guardian";

export interface EmailOwner {
  entity: EmailOwnerEntity;
  id: string;
}

const ENTITY_LABEL: Record<EmailOwnerEntity, string> = {
  student: "un estudiante",
  teacher: "un profesor",
  guardian: "un tutor",
};

/**
 * Asegura que el email no esté en uso por NINGUNA de las entidades
 * (Student / Teacher / FamilyGuardian) dentro de la misma academia.
 *
 * Para la entidad que se está creando/actualizando, pasar `exclude` con su
 * tipo e id (si aplica) para no chequear contra sí misma.
 *
 * Las colisiones dentro de la misma entidad también son detectadas aquí —
 * devuelven un error de negocio en lugar del P2022 crudo del constraint DB.
 */
export async function assertEmailUniqueInAcademy(
  prisma: PrismaService,
  academyId: string,
  email: string,
  exclude?: EmailOwner,
): Promise<void> {
  const normalized = email.trim();
  if (!normalized) return;

  const emailFilter = { mode: "insensitive" as const, equals: normalized };
  const excludeId = (entity: EmailOwnerEntity) =>
    exclude?.entity === entity ? { NOT: { id: exclude.id } } : {};

  const [student, teacher, guardian] = await Promise.all([
    prisma.student.findFirst({
      where: { academyId, email: emailFilter, ...excludeId("student") },
      select: { id: true },
    }),
    prisma.teacher.findFirst({
      where: { academyId, email: emailFilter, ...excludeId("teacher") },
      select: { id: true },
    }),
    prisma.familyGuardian.findFirst({
      where: { academyId, email: emailFilter, ...excludeId("guardian") },
      select: { id: true },
    }),
  ]);

  const conflict: EmailOwnerEntity | null = student
    ? "student"
    : teacher
      ? "teacher"
      : guardian
        ? "guardian"
        : null;

  if (conflict) {
    throw new BadRequestException(
      `El email ya está registrado para ${ENTITY_LABEL[conflict]} en esta academia`,
    );
  }
}
