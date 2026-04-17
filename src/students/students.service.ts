import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentInput } from "./dto/create-student.input";
import { UpdateStudentInput } from "./dto/update-student.input";
import { UpdateStudentPersonalInfoInput } from "./dto/update-student-personal-info.input";
import { UpdateStudentContactInfoInput } from "./dto/update-student-contact-info.input";
import { Prisma } from "@prisma/client";
import { Student } from "./entities/student.entity";
import { Status } from "../common/enums";
import { mapStudentToEntity } from "./utils/student-mapper.util";
import { assertOwnership } from "../common/utils/tenant-validation";
import { assertEmailUniqueInAcademy } from "../common/utils/email-uniqueness.util";

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);
  constructor(private prisma: PrismaService) {}

  async create(
    createStudentInput: CreateStudentInput,
    academyId: string,
  ): Promise<Student> {
    try {
      const { classIds, ...studentData } = createStudentInput;

      if (studentData.email) {
        await assertEmailUniqueInAcademy(
          this.prisma,
          academyId,
          studentData.email,
        );
      }

      const student = await this.prisma.student.create({
        data: {
          ...studentData,
          academyId,
          status: Status.ENABLED,
        },
      });

      // Assign student to classes if classIds are provided
      if (classIds && classIds.length > 0) {
        await this.prisma.classStudent.createMany({
          data: classIds.map((classId) => ({
            classId,
            studentId: student.id,
          })),
        });
      }

      return mapStudentToEntity(student);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("El email ya está registrado");
      }
      throw new BadRequestException("Error al crear el estudiante");
    }
  }

  async findOne(id: string, academyId: string): Promise<Student> {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    assertOwnership(student, academyId, "Estudiante");

    return mapStudentToEntity(student);
  }

  async findAll(
    academyId: string,
    page = 1,
    limit = 10,
    search?: string,
    status?: Status,
    classId?: string,
  ) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const where: Prisma.StudentWhereInput = {
      academyId,
      ...(classId && {
        classStudents: {
          some: { classId },
        },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(status && { status }),
    };

    const [total, data] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: data.map((student) => mapStudentToEntity(student)),
      meta: {
        total,
        page: validPage,
        limit: validLimit,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    };
  }

  async update(
    updateStudentInput: UpdateStudentInput,
    academyId: string,
  ): Promise<Student> {
    const { id, ...data } = updateStudentInput;

    await this.findOne(id, academyId);

    if (data.email) {
      await assertEmailUniqueInAcademy(this.prisma, academyId, data.email, {
        entity: "student",
        id,
      });
    }

    try {
      const student = await this.prisma.student.update({
        where: { id },
        data,
      });
      return mapStudentToEntity(student);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("El email ya está registrado");
      }
      throw new BadRequestException("Error al actualizar el estudiante");
    }
  }

  async updatePersonalInfo(
    input: UpdateStudentPersonalInfoInput,
    academyId: string,
  ): Promise<Student> {
    const { id, ...data } = input;
    await this.findOne(id, academyId);

    const student = await this.prisma.student.update({
      where: { id },
      data,
    });
    return mapStudentToEntity(student);
  }

  async updateContactInfo(
    input: UpdateStudentContactInfoInput,
    academyId: string,
  ): Promise<Student> {
    const { studentId, ...data } = input;
    await this.findOne(studentId, academyId);

    if (data.email) {
      await assertEmailUniqueInAcademy(this.prisma, academyId, data.email, {
        entity: "student",
        id: studentId,
      });
    }

    const student = await this.prisma.student.update({
      where: { id: studentId },
      data,
    });
    return mapStudentToEntity(student);
  }

  async remove(id: string, academyId: string): Promise<Student> {
    await this.findOne(id, academyId);

    const student = await this.prisma.student.delete({
      where: { id },
    });
    return mapStudentToEntity(student);
  }

  async getStats(academyId: string) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.student.count({ where: { academyId } }),
      this.prisma.student.count({
        where: { academyId, status: Status.ENABLED },
      }),
      this.prisma.student.count({
        where: { academyId, status: Status.DISABLED },
      }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
