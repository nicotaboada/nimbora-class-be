import { FamilyGuardian } from "@prisma/client";
import { Guardian } from "../entities/guardian.entity";
import { GuardianRelationship } from "../enums/guardian-relationship.enum";
import {
  genderMap,
  documentTypeMap,
  statusMap,
  guardianRelationshipMap,
} from "../../common/utils/enum-maps.util";
import { Status } from "../../common/enums/status.enum";
import { FamilyStudentSummary } from "../entities/family-student-summary.entity";

export function mapGuardianToEntity(
  prismaGuardian: FamilyGuardian & { gender?: string | null },
  students: FamilyStudentSummary[] = [],
): Guardian {
  return {
    id: prismaGuardian.id,
    firstName: prismaGuardian.firstName,
    lastName: prismaGuardian.lastName,
    relationship:
      guardianRelationshipMap[prismaGuardian.relationship] ||
      GuardianRelationship.OTRO,
    birthDate: prismaGuardian.birthDate ?? undefined,
    gender: prismaGuardian.gender
      ? genderMap[prismaGuardian.gender]
      : undefined,
    documentType: prismaGuardian.documentType
      ? documentTypeMap[prismaGuardian.documentType]
      : undefined,
    documentNumber: prismaGuardian.documentNumber ?? undefined,
    email: prismaGuardian.email || undefined,
    phoneCountryCode: prismaGuardian.phoneCountryCode || undefined,
    phoneNumber: prismaGuardian.phoneNumber || undefined,
    address: prismaGuardian.address || undefined,
    city: prismaGuardian.city || undefined,
    state: prismaGuardian.state || undefined,
    country: prismaGuardian.country || undefined,
    postalCode: prismaGuardian.postalCode || undefined,
    familyId: prismaGuardian.familyId || undefined,
    academyId: prismaGuardian.academyId,
    emailNotifications: prismaGuardian.emailNotifications,
    isResponsibleForBilling: prismaGuardian.isResponsibleForBilling,
    isActive: statusMap[prismaGuardian.status] === Status.ENABLED,
    students,
    avatarUrl: prismaGuardian.avatarUrl ?? undefined,
    createdAt: prismaGuardian.createdAt,
  };
}
