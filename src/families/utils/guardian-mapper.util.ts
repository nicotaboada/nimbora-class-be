import { FamilyGuardian } from '@prisma/client';
import { Guardian } from '../entities/guardian.entity';

export function mapGuardianToEntity(prismaGuardian: FamilyGuardian): Guardian {
  return {
    id: prismaGuardian.id,
    firstName: prismaGuardian.firstName,
    lastName: prismaGuardian.lastName,
    relationship: prismaGuardian.relationship as any,
    email: prismaGuardian.email || undefined,
    phoneNumber: prismaGuardian.phoneNumber || undefined,
    familyId: prismaGuardian.familyId || undefined,
    academyId: prismaGuardian.academyId,
    emailNotifications: prismaGuardian.emailNotifications,
    createdAt: prismaGuardian.createdAt,
  };
}
