import {
  Teacher as PrismaTeacher,
  ContactInfo as PrismaContactInfo,
} from "@prisma/client";
import { Teacher } from "../entities/teacher.entity";
import { ContactInfo } from "../../contact-info/entities/contact-info.entity";
import { Status } from "../../common/enums";
import {
  genderMap,
  documentTypeMap,
  statusMap,
} from "../../common/utils/enum-maps.util";

function mapContactInfoToEntity(
  prismaContactInfo: PrismaContactInfo,
): ContactInfo {
  return {
    id: prismaContactInfo.id,
    email: prismaContactInfo.email,
    phoneCountryCode: prismaContactInfo.phoneCountryCode,
    phoneNumber: prismaContactInfo.phoneNumber,
    address: prismaContactInfo.address,
    country: prismaContactInfo.country,
    state: prismaContactInfo.state,
    city: prismaContactInfo.city,
    postalCode: prismaContactInfo.postalCode,
    createdAt: prismaContactInfo.createdAt,
    updatedAt: prismaContactInfo.updatedAt,
  };
}

export function mapTeacherToEntity(
  prismaTeacher: PrismaTeacher & { contactInfo?: PrismaContactInfo | null },
): Teacher {
  const contactInfo = prismaTeacher.contactInfo
    ? mapContactInfoToEntity(prismaTeacher.contactInfo)
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
