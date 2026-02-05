import { User as PrismaUser } from "@prisma/client";
import { User } from "../entities/user.entity";
import { UserRole } from "../enums/user-role.enum";

/**
 * Maps a Prisma User to the User entity.
 * @param prismaUser The user object from Prisma
 * @returns The mapped User entity
 */
export function mapUserToEntity(prismaUser: PrismaUser): User {
  const roleMap: Record<PrismaUser["role"], UserRole> = {
    ADMIN: UserRole.ADMIN,
    OWNER: UserRole.OWNER,
    STAFF: UserRole.STAFF,
    TEACHER: UserRole.TEACHER,
    STUDENT: UserRole.STUDENT,
  };

  return {
    id: prismaUser.id,
    supabaseUserId: prismaUser.supabaseUserId,
    academyId: prismaUser.academyId,
    role: roleMap[prismaUser.role],
    firstName: prismaUser.firstName,
    lastName: prismaUser.lastName,
    email: prismaUser.email,
    phone: prismaUser.phone ?? undefined,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt,
  };
}
