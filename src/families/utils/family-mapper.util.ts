import { Family as PrismaFamily } from "@prisma/client";
import { Family } from "../entities/family.entity";
import { GuardianRelationship } from "../enums/guardian-relationship.enum";
import { Status } from "../../common/enums/status.enum";
import { statusMap } from "../../common/utils/enum-maps.util";

interface FamilyWithRelations extends PrismaFamily {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    classStudents: Array<{
      class: {
        id: string;
        name: string;
      };
    }>;
  }>;
  guardians: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    avatarUrl: string | null;
    emailNotifications: boolean;
    isResponsibleForBilling: boolean;
    email: string | null;
    phoneNumber: string | null;
  }>;
}

export function mapFamilyToEntity(prismaFamily: FamilyWithRelations): Family {
  const students = prismaFamily.students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    isActive: statusMap[s.status] === Status.ENABLED,
    classes: s.classStudents.map((cs) => ({
      id: cs.class.id,
      name: cs.class.name,
    })),
  }));

  const guardians = prismaFamily.guardians.map((g) => ({
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    relationship: g.relationship as GuardianRelationship,
    avatarUrl: g.avatarUrl || undefined,
    emailNotifications: g.emailNotifications,
    isResponsibleForBilling: g.isResponsibleForBilling,
    email: g.email || undefined,
    phoneNumber: g.phoneNumber || undefined,
  }));

  return {
    id: prismaFamily.id,
    name: prismaFamily.name,
    code: prismaFamily.code ?? undefined,
    membersCount: students.length + guardians.length,
    students,
    guardians,
    tags: prismaFamily.tags,
    createdAt: prismaFamily.createdAt,
  };
}
