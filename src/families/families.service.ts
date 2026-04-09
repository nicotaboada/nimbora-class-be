import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { mapFamilyToEntity } from "./utils/family-mapper.util";
import { mapGuardianToEntity } from "./utils/guardian-mapper.util";
import { CreateFamilyInput } from "./dto/create-family.input";
import { CreateGuardianInput } from "./dto/create-guardian.input";
import { UpdateGuardianInput } from "./dto/update-guardian.input";
import { UpdateGuardianNotificationsInput } from "./dto/update-guardian-notifications.input";
import { UpdateGuardianPersonalInfoInput } from "./dto/update-guardian-personal-info.input";
import { UpdateGuardianContactInfoInput } from "./dto/update-guardian-contact-info.input";
import { assertOwnership } from "../common/utils/tenant-validation";
import { pickDefined } from "../common/utils/pick-defined.util";
import { mapStudentToEntity } from "../students/utils/student-mapper.util";
import { PaginatedStudents } from "../students/dto/paginated-students.output";
import { AvailableStudentsForFamilyInput } from "./dto/available-students-for-family.input";

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string, academyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        guardians: true,
        students: {
          include: {
            classStudents: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    assertOwnership(family, academyId, "Family");

    return mapFamilyToEntity(family);
  }

  async findAll(academyId: string, page = 1, limit = 10, search?: string) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;

    const where: Prisma.FamilyWhereInput = {
      academyId,
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [total, data] = await Promise.all([
      this.prisma.family.count({ where }),
      this.prisma.family.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          students: {
            include: {
              classStudents: {
                include: {
                  class: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          guardians: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              relationship: true,
              avatarUrl: true,
              emailNotifications: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: data.map((family) => mapFamilyToEntity(family)),
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

  async create(input: CreateFamilyInput, academyId: string) {
    const family = await this.prisma.family.create({
      data: {
        name: input.name,
        academyId,
      },
      include: {
        students: {
          include: {
            classStudents: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        guardians: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            relationship: true,
            avatarUrl: true,
            emailNotifications: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return mapFamilyToEntity(family);
  }

  async createGuardian(input: CreateGuardianInput, academyId: string) {
    if (input.familyId) {
      const family = await this.prisma.family.findUnique({
        where: { id: input.familyId },
      });
      assertOwnership(family, academyId, "Family");
    }

    const guardian = await this.prisma.familyGuardian.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        relationship: input.relationship,
        email: input.email || null,
        phoneNumber: input.phoneNumber || null,
        familyId: input.familyId || null,
        academyId,
      },
    });

    return mapGuardianToEntity(guardian, []);
  }

  async familyStudents(
    familyId: string,
    academyId: string,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginatedStudents> {
    // Validate family ownership
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    assertOwnership(family, academyId, "Family");

    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;

    // Build where clause with optional search filter
    const where: Prisma.StudentWhereInput = {
      familyId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // Get total count and paginated family students
    const [total, students] = await Promise.all([
      this.prisma.student.count({
        where,
      }),
      this.prisma.student.findMany({
        where,
        skip,
        take: validLimit,
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const totalPages = Math.ceil(total / validLimit);

    return {
      data: students.map((student) => mapStudentToEntity(student)),
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

  async availableStudentsForFamily(
    familyId: string,
    academyId: string,
    filter?: AvailableStudentsForFamilyInput,
  ): Promise<PaginatedStudents> {
    // Validate family ownership
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    assertOwnership(family, academyId, "Family");

    const validPage = Math.max(1, filter?.page ?? 1);
    const validLimit = Math.min(Math.max(1, filter?.limit ?? 10), 100);
    const skip = (validPage - 1) * validLimit;

    const where: Prisma.StudentWhereInput = {
      academyId,
      familyId: null, // Only students without a family
      ...(filter?.search && {
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

  async setFamilyStudents(
    familyId: string,
    studentIds: string[],
    academyId: string,
  ) {
    // Validate family ownership
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    assertOwnership(family, academyId, "Family");

    // Validate all students belong to the academy
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, academyId },
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException(
        "One or more students not found or do not belong to this academy",
      );
    }

    // Remove family from students that are not in the new list
    await this.prisma.student.updateMany({
      where: { familyId, id: { notIn: studentIds } },
      data: { familyId: null },
    });

    // Assign family to the new students list
    await this.prisma.student.updateMany({
      where: { id: { in: studentIds }, academyId },
      data: { familyId },
    });

    // Return updated family
    return this.findOne(familyId, academyId);
  }

  async updateGuardian(
    id: string,
    input: UpdateGuardianInput,
    academyId: string,
  ) {
    const guardian = await this.prisma.familyGuardian.findUnique({
      where: { id },
    });
    assertOwnership(guardian, academyId, "Guardian");

    // Build update data only with provided fields
    const updateData = pickDefined(input);

    const updated = await this.prisma.familyGuardian.update({
      where: { id },
      data: updateData,
    });

    return mapGuardianToEntity(updated, []);
  }

  async updateGuardianNotifications(
    input: UpdateGuardianNotificationsInput,
    academyId: string,
  ) {
    const guardian = await this.prisma.familyGuardian.findUnique({
      where: { id: input.guardianId },
    });
    assertOwnership(guardian, academyId, "Guardian");

    const updated = await this.prisma.familyGuardian.update({
      where: { id: input.guardianId },
      data: { emailNotifications: input.emailNotifications },
    });

    return mapGuardianToEntity(updated, []);
  }

  async updateGuardianPersonalInfo(
    input: UpdateGuardianPersonalInfoInput,
    academyId: string,
  ) {
    const guardian = await this.prisma.familyGuardian.findUnique({
      where: { id: input.guardianId },
    });
    assertOwnership(guardian, academyId, "Guardian");

    // Build update data only with provided fields
    const updateData = pickDefined(input);

    const updated = await this.prisma.familyGuardian.update({
      where: { id: input.guardianId },
      data: updateData,
    });

    return mapGuardianToEntity(updated, []);
  }

  async updateGuardianContactInfo(
    input: UpdateGuardianContactInfoInput,
    academyId: string,
  ) {
    const guardian = await this.prisma.familyGuardian.findUnique({
      where: { id: input.guardianId },
    });
    assertOwnership(guardian, academyId, "Guardian");

    // Build update data only with provided fields
    const updateData = pickDefined(input);

    const updated = await this.prisma.familyGuardian.update({
      where: { id: input.guardianId },
      data: updateData,
    });

    return mapGuardianToEntity(updated, []);
  }

  async findOneGuardian(id: string, academyId: string) {
    const guardian = await this.prisma.familyGuardian.findUnique({
      where: { id },
    });
    assertOwnership(guardian, academyId, "Guardian");

    // Fetch all students associated with this guardian's family
    const prismaStudents = await this.prisma.student.findMany({
      where: {
        familyId: guardian.familyId,
        academyId,
      },
      include: {
        classStudents: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Map students to FamilyStudentSummary
    const students = prismaStudents.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      isActive: s.status === "ENABLED",
      classes: s.classStudents.map((cs) => ({
        id: cs.class.id,
        name: cs.class.name,
      })),
    }));

    return mapGuardianToEntity(guardian, students);
  }
}
