import { Academy as PrismaAcademy } from "@prisma/client";
import { Academy } from "../entities/academy.entity";
import { AcademyStatus } from "../enums/academy-status.enum";

/**
 * Maps a Prisma Academy to the Academy entity.
 * @param prismaAcademy The academy object from Prisma
 * @returns The mapped Academy entity
 */
export function mapAcademyToEntity(prismaAcademy: PrismaAcademy): Academy {
  const statusMap: Record<PrismaAcademy["status"], AcademyStatus> = {
    ACTIVE: AcademyStatus.ACTIVE,
    INACTIVE: AcademyStatus.INACTIVE,
    SUSPENDED: AcademyStatus.SUSPENDED,
  };

  return {
    id: prismaAcademy.id,
    name: prismaAcademy.name,
    slug: prismaAcademy.slug,
    status: statusMap[prismaAcademy.status],
    country: prismaAcademy.country,
    currency: prismaAcademy.currency,
    timezone: prismaAcademy.timezone,
    email: prismaAcademy.email ?? undefined,
    phone: prismaAcademy.phone ?? undefined,
    address: prismaAcademy.address ?? undefined,
    ownerUserId: prismaAcademy.ownerUserId,
    createdAt: prismaAcademy.createdAt,
    updatedAt: prismaAcademy.updatedAt,
  };
}
