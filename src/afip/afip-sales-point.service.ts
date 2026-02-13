import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AfipService } from "./afip.service";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import { CreateAfipSalesPointInput } from "./dto/create-afip-sales-point.input";
import { UpdateAfipSalesPointInput } from "./dto/update-afip-sales-point.input";
import { AfipSalesPoint } from "./entities/afip-sales-point.entity";

@Injectable()
export class AfipSalesPointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly afipService: AfipService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Lista todos los puntos de venta de una academy.
   */
  async listByAcademy(academyId: string): Promise<AfipSalesPoint[]> {
    const settings = await this.getSettingsOrFail(academyId);
    return this.prisma.afipSalesPoint.findMany({
      where: { afipSettingsId: settings.id },
      orderBy: { number: "asc" },
    });
  }

  /**
   * Crea un punto de venta. No valida contra ARCA; se crea con isEnabledForArca = false e isActive = false.
   */
  async create(
    academyId: string,
    input: CreateAfipSalesPointInput,
  ): Promise<AfipSalesPoint> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");
    const settings = await this.getSettingsOrFail(academyId);
    const existing = await this.prisma.afipSalesPoint.findUnique({
      where: {
        afipSettingsId_number: {
          afipSettingsId: settings.id,
          number: input.number,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe un punto de venta con el número ${input.number}`,
      );
    }
    return this.prisma.afipSalesPoint.create({
      data: {
        afipSettings: { connect: { id: settings.id } },
        number: input.number,
        name: input.name,
        isActive: false,
        isEnabledForArca: false,
      },
    });
  }

  /**
   * Edita el nombre de un punto de venta.
   */
  async update(
    academyId: string,
    salesPointId: string,
    input: UpdateAfipSalesPointInput,
  ): Promise<AfipSalesPoint> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");
    const salesPoint = await this.findOwnedOrFail(academyId, salesPointId);
    return this.prisma.afipSalesPoint.update({
      where: { id: salesPoint.id },
      data: { name: input.name },
    });
  }

  /**
   * Alterna el estado activo/inactivo de un punto de venta.
   * Solo se puede activar si ya fue validado en ARCA.
   * Al activar un punto, desactiva automáticamente todos los demás.
   */
  async toggleActive(
    academyId: string,
    salesPointId: string,
  ): Promise<AfipSalesPoint> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");
    const salesPoint = await this.findOwnedOrFail(academyId, salesPointId);
    if (!salesPoint.isActive && !salesPoint.isEnabledForArca) {
      throw new BadRequestException(
        "No se puede activar un punto de venta que no fue validado en AFIP. " +
          "Validá el punto de venta primero usando validateAfipSalesPoint.",
      );
    }
    if (!salesPoint.isActive) {
      await this.prisma.afipSalesPoint.updateMany({
        where: {
          afipSettingsId: salesPoint.afipSettingsId,
          id: { not: salesPointId },
        },
        data: { isActive: false },
      });
    }
    return this.prisma.afipSalesPoint.update({
      where: { id: salesPoint.id },
      data: { isActive: !salesPoint.isActive },
    });
  }

  /**
   * Valida un punto de venta contra ARCA.
   * Consulta getSalesPoints() y si el número existe y no está bloqueado,
   * setea isEnabledForArca = true e isActive = true, y desactiva todos los demás.
   */
  async validateAgainstArca(
    academyId: string,
    salesPointId: string,
  ): Promise<AfipSalesPoint> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");
    const salesPoint = await this.findOwnedOrFail(academyId, salesPointId);
    const arcaPoints = await this.afipService.getArcaSalesPoints(academyId);
    const match = arcaPoints.find((p) => p.number === salesPoint.number);
    if (!match) {
      throw new BadRequestException(
        `El punto de venta ${salesPoint.number} no existe en ARCA para este CUIT. ` +
          "Verificá que el número sea correcto y que esté dado de alta en ARCA.",
      );
    }
    if (match.isBlocked) {
      throw new BadRequestException(
        `El punto de venta ${salesPoint.number} existe en ARCA pero está bloqueado.`,
      );
    }
    if (match.deactivatedAt) {
      throw new BadRequestException(
        `El punto de venta ${salesPoint.number} existe en ARCA pero fue dado de baja.`,
      );
    }
    await this.prisma.afipSalesPoint.updateMany({
      where: {
        afipSettingsId: salesPoint.afipSettingsId,
        id: { not: salesPointId },
      },
      data: { isActive: false },
    });
    return this.prisma.afipSalesPoint.update({
      where: { id: salesPoint.id },
      data: {
        isEnabledForArca: true,
        isActive: true,
      },
    });
  }

  /**
   * Obtiene los settings de AFIP de la academy o lanza error.
   */
  private async getSettingsOrFail(academyId: string) {
    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });
    if (!settings) {
      throw new BadRequestException(
        "La academia no tiene configuración de AFIP. Completar el setup primero.",
      );
    }
    return settings;
  }

  /**
   * Busca un punto de venta y verifica que pertenezca a la academy del usuario.
   */
  private async findOwnedOrFail(academyId: string, salesPointId: string) {
    const salesPoint = await this.prisma.afipSalesPoint.findUnique({
      where: { id: salesPointId },
      include: { afipSettings: true },
    });
    if (!salesPoint) {
      throw new NotFoundException(
        `Punto de venta con id ${salesPointId} no encontrado`,
      );
    }
    if (salesPoint.afipSettings.academyId !== academyId) {
      throw new BadRequestException(
        "El punto de venta no pertenece a esta academia",
      );
    }
    return salesPoint;
  }

  /**
   * Elimina un punto de venta.
   * No se puede eliminar un punto de venta que esté activo.
   */
  async delete(academyId: string, salesPointId: string): Promise<boolean> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");
    const salesPoint = await this.findOwnedOrFail(academyId, salesPointId);
    if (salesPoint.isActive) {
      throw new BadRequestException(
        "No se puede eliminar el punto de venta activo. Desactivalo primero.",
      );
    }
    await this.prisma.afipSalesPoint.delete({
      where: { id: salesPoint.id },
    });
    return true;
  }
}
