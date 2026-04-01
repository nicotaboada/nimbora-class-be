import { Teacher as PrismaTeacher, ContactInfo as PrismaContactInfo } from "@prisma/client";
import {
  Teacher,
  TeacherStatus,
  TeacherGender,
  TeacherDocumentType,
} from "../entities/teacher.entity";
import { ContactInfo } from "../../contact-info/entities/contact-info.entity";

export function mapTeacherToEntity(
  prismaTeacher: PrismaTeacher & { contactInfo?: PrismaContactInfo | null }
): Teacher {
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

  const contactInfo = prismaTeacher.contactInfo
    ? (prismaTeacher.contactInfo as ContactInfo)
    : undefined;

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
    contactInfo,
    status: statusMap[prismaTeacher.status] || TeacherStatus.ENABLED,
    createdAt: prismaTeacher.createdAt,
    updatedAt: prismaTeacher.updatedAt,
  };
}
