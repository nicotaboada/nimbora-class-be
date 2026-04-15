import {
  Class as PrismaClass,
  Program as PrismaProgram,
  Teacher as PrismaTeacher,
  ContactInfo as PrismaContactInfo,
} from "@prisma/client";
import { ClassEntity } from "../entities/class.entity";
import { mapTeacherToEntity } from "../../teachers/utils/teacher-mapper.util";
import { mapProgramToEntity } from "../../programs/utils/program-mapper.util";

type PrismaClassWithRelations = PrismaClass & {
  program: PrismaProgram;
  teacher: PrismaTeacher & {
    contactInfo?: PrismaContactInfo | null;
  };
  students?: {
    id: string;
  }[];
};

export function mapClassToEntity(
  prismaClass: PrismaClassWithRelations,
): ClassEntity {
  return {
    id: prismaClass.id,
    academyId: prismaClass.academyId,
    name: prismaClass.name,
    program: mapProgramToEntity(prismaClass.program),
    teacher: mapTeacherToEntity(prismaClass.teacher),
    startDate: prismaClass.startDate,
    endDate: prismaClass.endDate,
    capacity: prismaClass.capacity,
    code: prismaClass.code,
    description: prismaClass.description,
    tags: [],
    studentCount: prismaClass.students?.length ?? 0,
    createdAt: prismaClass.createdAt,
    updatedAt: prismaClass.updatedAt,
  };
}
