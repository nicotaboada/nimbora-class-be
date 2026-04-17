import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTeacherInput } from "./dto/create-teacher.input";
import { UpdateTeacherInput } from "./dto/update-teacher.input";
import { UpdateTeacherContactInfoInput } from "./dto/update-teacher-contact-info.input";
import { mapTeacherToEntity } from "./utils/teacher-mapper.util";
import { Teacher, TeacherStats } from "./entities/teacher.entity";
import { assertOwnership } from "src/common/utils/tenant-validation";
import { assertEmailUniqueInAcademy } from "src/common/utils/email-uniqueness.util";

interface TeacherPagination {
  data: Teacher[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTeacherInput, academyId: string): Promise<Teacher> {
    const { classIds, ...teacherData } = input;

    if (teacherData.email) {
      await assertEmailUniqueInAcademy(
        this.prisma,
        academyId,
        teacherData.email,
      );
    }

    try {
      const teacher = await this.prisma.teacher.create({
        data: {
          ...teacherData,
          academyId,
        },
      });

      if (classIds && classIds.length > 0) {
        await this.prisma.class.updateMany({
          where: { id: { in: classIds } },
          data: { teacherId: teacher.id },
        });
      }

      return mapTeacherToEntity(teacher);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException(
          "El email ya está registrado para otro profesor en esta academia",
        );
      }
      throw error;
    }
  }

  async findAll(
    page: number,
    limit: number,
    academyId: string,
    search?: string,
    status?: Status,
    classId?: string,
  ): Promise<TeacherPagination> {
    const skip = (page - 1) * limit;

    const where = {
      academyId,
      ...(classId && {
        classes: {
          some: { id: classId },
        },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(status && { status }),
    } satisfies Prisma.TeacherWhereInput;

    const teachers = await this.prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    const total = await this.prisma.teacher.count({ where });

    return {
      data: teachers.map((element) => mapTeacherToEntity(element)),
      meta: {
        page,
        limit,
        total,
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string, academyId: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    assertOwnership(teacher, academyId, "Teacher");

    return mapTeacherToEntity(teacher);
  }

  async update(input: UpdateTeacherInput, academyId: string): Promise<Teacher> {
    const { id, ...updateData } = input;

    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    assertOwnership(teacher, academyId, "Teacher");

    if (updateData.email) {
      await assertEmailUniqueInAcademy(
        this.prisma,
        academyId,
        updateData.email,
        { entity: "teacher", id },
      );
    }

    try {
      const updated = await this.prisma.teacher.update({
        where: { id },
        data: updateData,
      });

      return mapTeacherToEntity(updated);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException(
          "El email ya está registrado para otro profesor en esta academia",
        );
      }
      throw error;
    }
  }

  async remove(id: string, academyId: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    assertOwnership(teacher, academyId, "Teacher");

    const deleted = await this.prisma.teacher.delete({
      where: { id },
    });

    return mapTeacherToEntity(deleted);
  }

  async getStats(academyId: string): Promise<TeacherStats> {
    const [total, active, inactive] = await Promise.all([
      this.prisma.teacher.count({ where: { academyId } }),
      this.prisma.teacher.count({
        where: { academyId, status: "ENABLED" },
      }),
      this.prisma.teacher.count({
        where: { academyId, status: "DISABLED" },
      }),
    ]);

    return { total, active, inactive };
  }

  async updateContactInfo(
    input: UpdateTeacherContactInfoInput,
    academyId: string,
  ): Promise<Teacher> {
    const { teacherId, ...contactData } = input;

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    assertOwnership(teacher, academyId, "Teacher");

    if (contactData.email) {
      await assertEmailUniqueInAcademy(
        this.prisma,
        academyId,
        contactData.email,
        { entity: "teacher", id: teacherId },
      );
    }

    try {
      const updated = await this.prisma.teacher.update({
        where: { id: teacherId },
        data: contactData,
      });

      return mapTeacherToEntity(updated);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException(
          "El email ya está registrado para otro profesor en esta academia",
        );
      }
      throw error;
    }
  }
}
