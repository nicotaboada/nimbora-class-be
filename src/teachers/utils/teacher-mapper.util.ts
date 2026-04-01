import { Teacher as PrismaTeacher } from "@prisma/client";
import {
  Teacher,
  TeacherStatus,
  TeacherGender,
  TeacherDocumentType,
} from "../entities/teacher.entity";

export function mapTeacherToEntity(prismaTeacher: PrismaTeacher): Teacher {
  const statusMap: Record<string, TeacherStatus> = {
    ENABLED: TeacherStatus.ENABLED,
    DISABLED: TeacherStatus.DISABLED,
  };

  const genderMap: Record<string, TeacherGender | undefined> = {
    MALE: TeacherGender.MALE,
    FEMALE: TeacherGender.FEMALE,
    OTHER: TeacherGender.OTHER,
    NOT_SPECIFIED: TeacherGender.NOT_SPECIFIED,
  };

  const documentTypeMap: Record<string, TeacherDocumentType | undefined> = {
    DNI: TeacherDocumentType.DNI,
    PASSPORT: TeacherDocumentType.PASSPORT,
    NIE: TeacherDocumentType.NIE,
    OTHER: TeacherDocumentType.OTHER,
  };

  return {
    id: prismaTeacher.id,
    academyId: prismaTeacher.academyId,
    firstName: prismaTeacher.firstName,
    lastName: prismaTeacher.lastName,
    email: prismaTeacher.email,
    phoneNumber: prismaTeacher.phoneNumber,
    birthYear: prismaTeacher.birthYear,
    gender: prismaTeacher.gender ? genderMap[prismaTeacher.gender] : undefined,
    documentType: prismaTeacher.documentType
      ? documentTypeMap[prismaTeacher.documentType]
      : undefined,
    documentNumber: prismaTeacher.documentNumber,
    status: statusMap[prismaTeacher.status] || TeacherStatus.ENABLED,
    createdAt: prismaTeacher.createdAt,
    updatedAt: prismaTeacher.updatedAt,
  };
}
