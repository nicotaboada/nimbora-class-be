import { Class as PrismaClass, Program as PrismaProgram, Teacher as PrismaTeacher, ContactInfo as PrismaContactInfo } from "@prisma/client";
import { ClassEntity } from "../entities/class.entity";
import { mapTeacherToEntity } from "../../teachers/utils/teacher-mapper.util";
import { mapProgramToEntity } from "../../programs/utils/program-mapper.util";

export function mapClassToEntity(
  prismaClass: PrismaClass & {
    program: PrismaProgram;
    teacher: PrismaTeacher & { contactInfo?: PrismaContactInfo | null };
  },
): ClassEntity {
  return {
    id: prismaClass.id,
    academyId: prismaClass.academyId,
    name: prismaClass.name,
    program: mapProgramToEntity(prismaClass.program),
    teacher: mapTeacherToEntity(prismaClass.teacher),
    startDate: prismaClass.startDate,
    endDate: prismaClass.endDate,
    capacity: prismaClass.capacity ?? undefined,
    code: prismaClass.code ?? undefined,
    createdAt: prismaClass.createdAt,
    updatedAt: prismaClass.updatedAt,
  };
}
