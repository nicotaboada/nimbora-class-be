import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBillingProfileInput } from "./dto/upsert-billing-profile.input";
import { BillingProfile } from "./entities/billing-profile.entity";
import { assertOwnership } from "../common/utils/tenant-validation";

@Injectable()
export class BillingProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea o actualiza un BillingProfile para un alumno.
   * Si input.id viene, es un update; si no, es un create.
   */
  async upsert(
    academyId: string,
    input: UpsertBillingProfileInput,
  ): Promise<BillingProfile> {
    await this.validateStudentBelongsToAcademy(input.studentId, academyId);

    const { id, studentId, isDefault, ...profileData } = input;

    if (id) {
      return this.updateProfile(
        id,
        academyId,
        studentId,
        isDefault,
        profileData,
      );
    }

    return this.createProfile(academyId, studentId, isDefault, profileData);
  }

  /**
   * Obtiene todos los billing profiles de un alumno.
   */
  async findByStudent(
    studentId: string,
    academyId: string,
  ): Promise<BillingProfile[]> {
    await this.validateStudentBelongsToAcademy(studentId, academyId);

    const profiles = await this.prisma.billingProfile.findMany({
      where: { studentId, academyId },
      orderBy: { createdAt: "desc" },
    });

    return profiles;
  }

  /**
   * Obtiene un billing profile por ID, validando tenancy.
   */
  async findOne(id: string, academyId: string): Promise<BillingProfile> {
    const profile = await this.prisma.billingProfile.findUnique({
      where: { id },
    });

    assertOwnership(profile, academyId, "BillingProfile");
    return profile;
  }

  /**
   * Crea un nuevo BillingProfile.
   * Si isDefault es true, desmarca los otros perfiles del alumno como no-default.
   */
  private async createProfile(
    academyId: string,
    studentId: string,
    isDefault: boolean | undefined,
    profileData: Omit<
      UpsertBillingProfileInput,
      "id" | "studentId" | "isDefault"
    >,
  ): Promise<BillingProfile> {
    const shouldBeDefault = isDefault ?? true;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.billingProfile.updateMany({
          where: { studentId, academyId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.billingProfile.create({
        data: {
          ...profileData,
          academyId,
          studentId,
          isDefault: shouldBeDefault,
        },
      });

      return created;
    });
  }

  /**
   * Actualiza un BillingProfile existente.
   * Valida ownership antes de actualizar.
   */
  private async updateProfile(
    id: string,
    academyId: string,
    studentId: string,
    isDefault: boolean | undefined,
    profileData: Omit<
      UpsertBillingProfileInput,
      "id" | "studentId" | "isDefault"
    >,
  ): Promise<BillingProfile> {
    const existing = await this.prisma.billingProfile.findUnique({
      where: { id },
    });

    assertOwnership(existing, academyId, "BillingProfile");

    return this.prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.billingProfile.updateMany({
          where: { studentId, academyId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.billingProfile.update({
        where: { id },
        data: {
          ...profileData,
          ...(isDefault === undefined ? {} : { isDefault }),
        },
      });

      return updated;
    });
  }

  /**
   * Valida que el alumno pertenece a la academia.
   */
  private async validateStudentBelongsToAcademy(
    studentId: string,
    academyId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.academyId !== academyId) {
      throw new BadRequestException(
        "El alumno no existe o no pertenece a esta academia",
      );
    }
  }
}
