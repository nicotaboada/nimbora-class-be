import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentInput } from "./dto/create-student.input";
import { UpdateStudentInput } from "./dto/update-student.input";
import { Prisma } from "@prisma/client";
import { StudentStatus } from "./entities/student.entity";

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentInput: CreateStudentInput) {
    try {
      return await this.prisma.student.create({
        data: {
          ...createStudentInput,
          status: StudentStatus.ENABLED,
        },
      });
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

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
    }

    return student;
  }

  async findAll(page = 1, limit = 10, search?: string, status?: StudentStatus) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const where: Prisma.StudentWhereInput = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

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
      data,
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

  async update(updateStudentInput: UpdateStudentInput) {
    const { id, ...data } = updateStudentInput;

    await this.findOne(id);

    try {
      return await this.prisma.student.update({
        where: { id },
        data,
      });
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

  async remove(id: string) {
    await this.findOne(id);

    return await this.prisma.student.delete({
      where: { id },
    });
  }

  async getStats() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({
        where: { status: StudentStatus.ENABLED },
      }),
      this.prisma.student.count({
        where: { status: StudentStatus.DISABLED },
      }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
