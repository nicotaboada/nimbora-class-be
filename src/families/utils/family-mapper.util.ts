import { Family as PrismaFamily } from "@prisma/client";
import { Family } from "../entities/family.entity";
import { FamilyStudentSummary } from "../entities/family-student-summary.entity";
import { FamilyGuardianSummary } from "../entities/family-guardian-summary.entity";
import { GuardianRelationship } from "../enums/guardian-relationship.enum";

interface FamilyWithRelations extends PrismaFamily {
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
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
    emailNotifications: boolean;
    email: string | null;
    phoneNumber: string | null;
  }>;
}

export function mapFamilyToEntity(prismaFamily: FamilyWithRelations): Family {
  const students = prismaFamily.students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
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
    emailNotifications: g.emailNotifications,
    email: g.email || undefined,
    phoneNumber: g.phoneNumber || undefined,
  }));

  return {
    id: prismaFamily.id,
    name: prismaFamily.name,
    membersCount: students.length + guardians.length,
    students,
    guardians,
    tags: prismaFamily.tags,
    createdAt: prismaFamily.createdAt,
  };
}
