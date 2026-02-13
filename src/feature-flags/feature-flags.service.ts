import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AcademyFeature } from "./entities/academy-feature.entity";

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Habilita o deshabilita un feature flag para una academy.
   * Usa upsert para crear el registro si no existe.
   */
  async setFlag(
    academyId: string,
    key: string,
    enabled: boolean,
  ): Promise<AcademyFeature> {
    return this.prisma.academyFeature.upsert({
      where: { academyId_key: { academyId, key } },
      update: { enabled },
      create: { academyId, key, enabled },
    });
  }

  /**
   * Lista todos los feature flags de una academy.
   */
  async getFlags(academyId: string): Promise<AcademyFeature[]> {
    return this.prisma.academyFeature.findMany({
      where: { academyId },
    });
  }

  /**
   * Verifica si un feature específico está habilitado para una academy.
   */
  async isEnabled(academyId: string, key: string): Promise<boolean> {
    const feature = await this.prisma.academyFeature.findUnique({
      where: { academyId_key: { academyId, key } },
    });
    return feature?.enabled ?? false;
  }

  /**
   * Lanza ForbiddenException si el feature no está habilitado.
   * Útil como guard en servicios que requieren un feature activo.
   */
  async assertFeatureEnabled(academyId: string, key: string): Promise<void> {
    const enabled = await this.isEnabled(academyId, key);
    if (!enabled) {
      throw new ForbiddenException(
        `El feature "${key}" no está habilitado para esta academy`,
      );
    }
  }
}
