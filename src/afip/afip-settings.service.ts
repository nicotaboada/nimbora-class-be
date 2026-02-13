import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AfipService, TaxpayerData } from "./afip.service";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import { SetupAfipSettingsInput } from "./dto/setup-afip-settings.input";
import { AcademyAfipSettings } from "./entities/academy-afip-settings.entity";

@Injectable()
export class AfipSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly afipService: AfipService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  /**
   * Consulta datos del contribuyente en ARCA por CUIT.
   */
  async lookupCuit(cuit: string): Promise<TaxpayerData> {
    return this.afipService.lookupTaxpayer(cuit);
  }

  /**
   * Obtiene la configuración AFIP de una academy.
   */
  async getSettings(academyId: string): Promise<AcademyAfipSettings | null> {
    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });
    return settings as AcademyAfipSettings | null;
  }

  /**
   * Step 1 — Guarda los datos fiscales de la academy.
   * Requiere feature flag AFIP habilitado.
   * Al completarse, avanza el onboarding a DELEGATION_1 (Step 2).
   */
  async setupSettings(
    academyId: string,
    input: SetupAfipSettingsInput,
  ): Promise<AcademyAfipSettings> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");

    const cuit = input.cuit.replaceAll("-", "");

    // Consultar datos del padrón ARCA para guardarlos
    const taxpayer = await this.afipService.lookupTaxpayer(cuit);

    const fiscalData = {
      cuit,
      taxStatus: input.taxStatus,
      razonSocial: taxpayer.razonSocial,
      personeria: taxpayer.personeria,
      condicionIva: taxpayer.condicionIva,
      domicilioFiscal: taxpayer.domicilioFiscal,
      actividadPrincipal: taxpayer.actividadPrincipal,
      onboardingStep: "DELEGATION_1" as const,
    };

    const result = await this.prisma.academyAfipSettings.upsert({
      where: { academyId },
      create: {
        academy: { connect: { id: academyId } },
        ...fiscalData,
      },
      update: fiscalData,
    });

    return result as AcademyAfipSettings;
  }

  /**
   * Step 3 — Verifica la delegación WSFE y actualiza el estado.
   * Si es válida, avanza el onboarding de DELEGATION_2 a COMPLETED.
   */
  async verifyDelegation(academyId: string): Promise<AcademyAfipSettings> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");

    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!settings) {
      throw new BadRequestException(
        "Primero hay que configurar los datos de AFIP (setupAfipSettings)",
      );
    }

    const { isValid, error } =
      await this.afipService.verifyDelegation(academyId);

    const updated = await this.prisma.academyAfipSettings.update({
      where: { academyId },
      data: {
        delegationStatus: isValid ? "OK" : "ERROR",
        delegatedAt: isValid ? new Date() : null,
        onboardingStep: isValid ? "COMPLETED" : "DELEGATION_2",
      },
    });

    if (!isValid) {
      throw new BadRequestException(
        `La delegación WSFE no es válida: ${error ?? "Error desconocido"}. ` +
          "Verificá que hayas delegado el servicio de Facturación Electrónica en ARCA.",
      );
    }

    return updated as AcademyAfipSettings;
  }

  /**
   * Step 2 — Confirma que el director ya delegó en ARCA.
   * Avanza el onboarding de DELEGATION_1 a DELEGATION_2 (listo para verificar).
   */
  async confirmDelegationReady(
    academyId: string,
  ): Promise<AcademyAfipSettings> {
    await this.featureFlagsService.assertFeatureEnabled(academyId, "AFIP");

    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!settings) {
      throw new BadRequestException(
        "Primero hay que configurar los datos de AFIP (setupAfipSettings)",
      );
    }

    if (settings.onboardingStep !== "DELEGATION_1") {
      throw new BadRequestException(
        "Solo se puede confirmar la delegación desde el paso DELEGATION_1",
      );
    }

    const updated = await this.prisma.academyAfipSettings.update({
      where: { academyId },
      data: { onboardingStep: "DELEGATION_2" },
    });

    return updated as AcademyAfipSettings;
  }
}
