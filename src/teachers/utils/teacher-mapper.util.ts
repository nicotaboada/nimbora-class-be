import {
  Teacher as PrismaTeacher,
  ContactInfo as PrismaContactInfo,
} from "@prisma/client";
import { Teacher } from "../entities/teacher.entity";
import { ContactInfo } from "../../contact-info/entities/contact-info.entity";
import { Status, Gender, DocumentType } from "../../common/enums";

export function mapTeacherToEntity(
  prismaTeacher: PrismaTeacher & { contactInfo?: PrismaContactInfo | null },
): Teacher {
  const statusMap: Record<string, Status> = {
    ENABLED: Status.ENABLED,
    DISABLED: Status.DISABLED,
  };

  const genderMap: Record<string, Gender | undefined> = {
    MALE: Gender.MALE,
    FEMALE: Gender.FEMALE,
    OTHER: Gender.OTHER,
    NOT_SPECIFIED: Gender.NOT_SPECIFIED,
  };

  const documentTypeMap: Record<string, DocumentType | undefined> = {
    DNI: DocumentType.DNI,
    PASSPORT: DocumentType.PASSPORT,
    NIE: DocumentType.NIE,
    OTHER: DocumentType.OTHER,
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
    avatarUrl: prismaTeacher.avatarUrl,
    contactInfo,
    status: statusMap[prismaTeacher.status] || Status.ENABLED,
    createdAt: prismaTeacher.createdAt,
    updatedAt: prismaTeacher.updatedAt,
  };
}
