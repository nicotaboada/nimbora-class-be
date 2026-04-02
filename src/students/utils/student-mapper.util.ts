import { Student as PrismaStudent } from "@prisma/client";
import { Student } from "../entities/student.entity";
import { Status } from "../../common/enums";

/**
 * Maps a Prisma Student to the Student entity.
 * @param prismaStudent The student object from Prisma
 * @returns The mapped Student entity
 */
export function mapStudentToEntity(prismaStudent: PrismaStudent): Student {
  const statusMap: Record<PrismaStudent["status"], Status> = {
    ENABLED: Status.ENABLED,
    DISABLED: Status.DISABLED,
  };

  return {
    id: prismaStudent.id,
    academyId: prismaStudent.academyId,
    firstName: prismaStudent.firstName,
    lastName: prismaStudent.lastName,
    email: prismaStudent.email,
    phoneNumber: prismaStudent.phoneNumber ?? undefined,
    status: statusMap[prismaStudent.status],
    createdAt: prismaStudent.createdAt,
    updatedAt: prismaStudent.updatedAt,
  };
}
