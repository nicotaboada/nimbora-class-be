import { Student as PrismaStudent } from "@prisma/client";
import { Student } from "../entities/student.entity";
import { Status } from "../../common/enums";
import {
  statusMap,
  genderMap,
  documentTypeMap,
} from "../../common/utils/enum-maps.util";

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
    birthDate: prismaStudent.birthDate ?? undefined,
    gender: prismaStudent.gender ? genderMap[prismaStudent.gender] : undefined,
    documentType: prismaStudent.documentType
      ? documentTypeMap[prismaStudent.documentType]
      : undefined,
    documentNumber: prismaStudent.documentNumber ?? undefined,
    phoneCountryCode: prismaStudent.phoneCountryCode ?? undefined,
    address: prismaStudent.address ?? undefined,
    city: prismaStudent.city ?? undefined,
    state: prismaStudent.state ?? undefined,
    country: prismaStudent.country ?? undefined,
    postalCode: prismaStudent.postalCode ?? undefined,
    status: statusMap[prismaStudent.status] || Status.ENABLED,
    familyId: prismaStudent.familyId ?? undefined,
    createdAt: prismaStudent.createdAt,
    updatedAt: prismaStudent.updatedAt,
  };
}
