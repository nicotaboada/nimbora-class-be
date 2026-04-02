import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClassInput } from "./dto/create-class.input";
import { ClassesFilterInput } from "./dto/classes-filter.input";
import { ClassEntity } from "./entities/class.entity";
import { PaginatedClasses } from "./dto/paginated-classes.output";
import { mapClassToEntity } from "./utils/class-mapper.util";
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
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: data.map(mapClassToEntity),
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
