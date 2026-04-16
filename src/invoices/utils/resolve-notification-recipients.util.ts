import { PrismaClient } from "@prisma/client";

export interface NotificationRecipient {
  email: string;
  name: string;
}

interface GuardianForRecipient {
  email: string | null;
  firstName: string;
  lastName: string;
  emailNotifications: boolean;
}

/**
 * Filtra guardians por preferencia de notificación + presencia de email.
 * Útil cuando ya se tienen los guardians cargados (caso bulk family invoice).
 */
export function mapGuardiansToRecipients(
  guardians: GuardianForRecipient[],
): NotificationRecipient[] {
  return guardians.flatMap((g) =>
    g.emailNotifications && g.email
      ? [{ email: g.email, name: `${g.firstName} ${g.lastName}` }]
      : [],
  );
}

/**
 * Resuelve destinatarios de email para una invoice asociada a un estudiante:
 * - Si tiene familia → guardians con emailNotifications activado.
 * - Si no tiene familia → fallback al email del propio alumno.
 */
export async function resolveNotificationRecipients(
  studentId: string,
  prisma: Pick<PrismaClient, "student">,
): Promise<NotificationRecipient[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      family: {
        select: {
          guardians: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              emailNotifications: true,
            },
          },
        },
      },
    },
  });

  if (!student) return [];

  if (student.family) {
    return mapGuardiansToRecipients(student.family.guardians);
  }

  if (student.email) {
    return [
      {
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
      },
    ];
  }

  return [];
}
