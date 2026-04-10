import { Injectable } from "@nestjs/common";
import { Prisma, Status } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTeacherInput } from "./dto/create-teacher.input";
import { UpdateTeacherInput } from "./dto/update-teacher.input";
import { UpdateContactInfoInput } from "../contact-info/dto/update-contact-info.input";
import { mapTeacherToEntity } from "./utils/teacher-mapper.util";
import { Teacher, TeacherStats } from "./entities/teacher.entity";
import { assertOwnership } from "src/common/utils/tenant-validation";

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
    const teacher = await this.prisma.teacher.create({
      data: {
        ...input,
        academyId,
      },
      include: { contactInfo: true },
    });

    return mapTeacherToEntity(teacher);
  }

  async findAll(
    page: number,
    limit: number,
    academyId: string,
    search?: string,
    status?: Status,
  ): Promise<TeacherPagination> {
    const skip = (page - 1) * limit;

    const where = {
      academyId,
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
      include: { contactInfo: true },
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
      include: { contactInfo: true },
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

    const updated = await this.prisma.teacher.update({
      where: { id },
      data: updateData,
      include: { contactInfo: true },
    });

    return mapTeacherToEntity(updated);
  }

  async remove(id: string, academyId: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });

    assertOwnership(teacher, academyId, "Teacher");

    const deleted = await this.prisma.teacher.delete({
      where: { id },
      include: { contactInfo: true },
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
    input: UpdateContactInfoInput,
    academyId: string,
  ): Promise<Teacher> {
    const { teacherId, ...contactData } = input;

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    assertOwnership(teacher, academyId, "Teacher");

    // Upsert contactInfo (create if not exists, update if exists)
    await this.prisma.contactInfo.upsert({
      where: { teacherId },
      update: contactData,
      create: { teacherId, ...contactData },
    });

    const updated = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { contactInfo: true },
    });

    return mapTeacherToEntity(updated);
  }
}
