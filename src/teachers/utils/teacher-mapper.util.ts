import { Teacher as PrismaTeacher } from "@prisma/client";
import { Teacher } from "../entities/teacher.entity";
import { Status } from "../../common/enums";
import {
  genderMap,
  documentTypeMap,
  statusMap,
} from "../../common/utils/enum-maps.util";

export function mapTeacherToEntity(prismaTeacher: PrismaTeacher): Teacher {
  return {
    id: prismaTeacher.id,
    academyId: prismaTeacher.academyId,
    firstName: prismaTeacher.firstName,
    lastName: prismaTeacher.lastName,
    birthDate: prismaTeacher.birthDate,
    gender: prismaTeacher.gender ? genderMap[prismaTeacher.gender] : undefined,
    documentType: prismaTeacher.documentType
      ? documentTypeMap[prismaTeacher.documentType]
      : undefined,
    documentNumber: prismaTeacher.documentNumber,
    avatarUrl: prismaTeacher.avatarUrl,
    email: prismaTeacher.email ?? undefined,
    phoneCountryCode: prismaTeacher.phoneCountryCode ?? undefined,
    phoneNumber: prismaTeacher.phoneNumber ?? undefined,
    address: prismaTeacher.address ?? undefined,
    country: prismaTeacher.country ?? undefined,
    state: prismaTeacher.state ?? undefined,
    city: prismaTeacher.city ?? undefined,
    postalCode: prismaTeacher.postalCode ?? undefined,
    status: statusMap[prismaTeacher.status] || Status.ENABLED,
    createdAt: prismaTeacher.createdAt,
    updatedAt: prismaTeacher.updatedAt,
  };
}
