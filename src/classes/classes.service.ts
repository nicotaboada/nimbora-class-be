import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClassInput } from "./dto/create-class.input";
import { UpdateClassInput } from "./dto/update-class.input";
import { ClassesFilterInput } from "./dto/classes-filter.input";
import { AvailableStudentsFilterInput } from "./dto/available-students-filter.input";
import { AssignStudentsToClassInput } from "./dto/assign-students-to-class.input";
import { ClassEntity } from "./entities/class.entity";
import { PaginatedClasses } from "./dto/paginated-classes.output";
import { PaginatedClassStudents } from "./dto/paginated-class-students.output";
import { mapClassToEntity } from "./utils/class-mapper.util";
import { mapStudentToEntity } from "../students/utils/student-mapper.util";
import { assertOwnership } from "../common/utils/tenant-validation";
import { Prisma } from "@prisma/client";

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(
    input: CreateClassInput,
    academyId: string,
  ): Promise<ClassEntity> {
    // Validate program ownership
    const program = await this.prisma.program.findUnique({
      where: { id: input.programId },
    });
    assertOwnership(program, academyId, "Programa");

    // Validate teacher ownership
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: input.teacherId },
    });
    assertOwnership(teacher, academyId, "Profesor");

    // Create class
    const cls = await this.prisma.class.create({
      data: {
        ...input,
        academyId,
      },
      include: {
        program: true,
        teacher: {
          include: {
            contactInfo: true,
          },
        },
      },
    });

    return mapClassToEntity(cls);
  }

  async findOne(id: string, academyId: string): Promise<ClassEntity> {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        program: true,
        teacher: {
          include: {
            contactInfo: true,
          },
        },
      },
    });

    assertOwnership(cls, academyId, "Clase");
    return mapClassToEntity(cls);
  }

  async update(
    classId: string,
    input: UpdateClassInput,
    academyId: string,
  ): Promise<ClassEntity> {
    // Verify class ownership
    const existing = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    assertOwnership(existing, academyId, "Clase");

    // If program changes, verify ownership
    if (input.programId) {
      const program = await this.prisma.program.findUnique({
        where: { id: input.programId },
      });
      assertOwnership(program, academyId, "Programa");
    }

    // If teacher changes, verify ownership
    if (input.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: input.teacherId },
      });
      assertOwnership(teacher, academyId, "Profesor");
    }

    // Build update data object (exclude id field)
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.programId !== undefined) updateData.programId = input.programId;
    if (input.teacherId !== undefined) updateData.teacherId = input.teacherId;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.code !== undefined) updateData.code = input.code;

    // Update class
    const cls = await this.prisma.class.update({
      where: { id: classId },
      data: updateData,
      include: {
        program: true,
        teacher: {
          include: {
            contactInfo: true,
          },
        },
        students: {
          select: {
            id: true,
          },
        },
      },
    });

    return mapClassToEntity(cls);
  }

  async findAll(
    filter: ClassesFilterInput | undefined,
    academyId: string,
  ): Promise<PaginatedClasses> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 10;
    const search = filter?.search;
    const programId = filter?.programId;

    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const where: Prisma.ClassWhereInput = {
      academyId,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (programId) {
      where.programId = programId;
    }

    const [total, data] = await Promise.all([
      this.prisma.class.count({ where }),
      this.prisma.class.findMany({
        where,
        skip,
        take,
        include: {
          program: true,
          teacher: {
            include: {
              contactInfo: true,
            },
          },
          students: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: data.map((element) => mapClassToEntity(element)),
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

  async assignStudents(
    input: AssignStudentsToClassInput,
    academyId: string,
  ): Promise<ClassEntity> {
    // Validate class ownership
    const cls = await this.prisma.class.findUnique({
      where: { id: input.classId },
    });
    assertOwnership(cls, academyId, "Clase");

    // Validate all students belong to the academy
    const students = await this.prisma.student.findMany({
      where: { id: { in: input.studentIds }, academyId },
    });

    if (students.length !== input.studentIds.length) {
      throw new BadRequestException(
        "One or more students not found or do not belong to this academy",
      );
    }

    // Sync: delete all existing assignments and create new ones
    await this.prisma.classStudent.deleteMany({
      where: { classId: input.classId },
    });

    await this.prisma.classStudent.createMany({
      data: input.studentIds.map((studentId) => ({
        classId: input.classId,
        studentId,
      })),
    });

    // Return updated class with students
    const updatedClass = await this.prisma.class.findUnique({
      where: { id: input.classId },
      include: {
        program: true,
        teacher: {
          include: {
            contactInfo: true,
          },
        },
        students: {
          select: {
            id: true,
          },
        },
      },
    });

    return mapClassToEntity(updatedClass);
  }

  async removeStudentFromClass(
    classId: string,
    studentId: string,
    academyId: string,
  ): Promise<ClassEntity> {
    // Verify class belongs to academy
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    assertOwnership(cls, academyId, "Clase");

    // Delete the single ClassStudent join row
    await this.prisma.classStudent.delete({
      where: { classId_studentId: { classId, studentId } },
    });

    // Return updated class with students
    const updatedClass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        program: true,
        teacher: {
          include: {
            contactInfo: true,
          },
        },
        students: {
          select: {
            id: true,
          },
        },
      },
    });

    return mapClassToEntity(updatedClass);
  }

  async findStudentsByClass(
    classId: string,
    academyId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedClassStudents> {
    // Validate class ownership
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    assertOwnership(cls, academyId, "Clase");

    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    // Build where clause with optional search filter
    const where: Prisma.ClassStudentWhereInput = {
      classId,
      ...(search && {
        student: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    };

    // Get total count and paginated students
    const [total, classStudents] = await Promise.all([
      this.prisma.classStudent.count({
        where,
      }),
      this.prisma.classStudent.findMany({
        where,
        include: { student: true },
        skip,
        take,
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: classStudents.map((item) => mapStudentToEntity(item.student)),
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

  async findAvailableStudentsForClass(
    classId: string,
    academyId: string,
    filter: AvailableStudentsFilterInput,
  ): Promise<PaginatedClassStudents> {
    // Validate class ownership
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    assertOwnership(cls, academyId, "Clase");

    const validPage = Math.max(1, filter.page ?? 1);
    const validLimit = Math.min(Math.max(1, filter.limit ?? 10), 100);
    const skip = (validPage - 1) * validLimit;

    const where: Prisma.StudentWhereInput = {
      academyId,
      classStudents: { none: { classId } }, // Exclude students already in the class
      ...(filter.search && {
        OR: [
          { firstName: { contains: filter.search, mode: "insensitive" } },
          { lastName: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: validLimit,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: students.map((element) => mapStudentToEntity(element)),
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
}
