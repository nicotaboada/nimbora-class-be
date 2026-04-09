import { Student as PrismaStudent } from "@prisma/client";
import { Student } from "../entities/student.entity";
import { Status } from "../../common/enums";
import { statusMap } from "../../common/utils/enum-maps.util";

/**
 * Maps a Prisma Student to the Student entity.
 * @param prismaStudent The student object from Prisma
 * @returns The mapped Student entity
 */
export function mapStudentToEntity(prismaStudent: PrismaStudent): Student {
  return {
    id: prismaStudent.id,
    academyId: prismaStudent.academyId,
    firstName: prismaStudent.firstName,
    lastName: prismaStudent.lastName,
    email: prismaStudent.email,
    phoneNumber: prismaStudent.phoneNumber ?? undefined,
    status: statusMap[prismaStudent.status] || Status.ENABLED,
    familyId: prismaStudent.familyId ?? undefined,
    createdAt: prismaStudent.createdAt,
    updatedAt: prismaStudent.updatedAt,
  };
}
