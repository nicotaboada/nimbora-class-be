import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AfipSettingsService } from "./afip-settings.service";
import { AcademyAfipSettings } from "./entities/academy-afip-settings.entity";
import { TaxpayerInfo } from "./entities/taxpayer-info.entity";
import { SetupAfipSettingsInput } from "./dto/setup-afip-settings.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => AcademyAfipSettings)
@UseGuards(SupabaseAuthGuard)
export class AfipSettingsResolver {
  constructor(private readonly afipSettingsService: AfipSettingsService) {}

  /**
   * Consulta datos del contribuyente en ARCA por CUIT.
   * No requiere que el feature AFIP esté habilitado (es parte del onboarding).
   */
  @Query(() => TaxpayerInfo, {
    name: "lookupCuit",
    description: "Consulta datos del contribuyente en ARCA por CUIT",
  })
  async lookupCuit(
    @Args("cuit", { description: "CUIT a consultar (con o sin guiones)" })
    cuit: string,
  ): Promise<TaxpayerInfo> {
    return this.afipSettingsService.lookupCuit(cuit);
  }

  /**
   * Obtiene la configuración AFIP de la academy del usuario.
   * Incluye onboardingStep para que el frontend sepa en qué paso está.
   * Devuelve null si el onboarding no se ha iniciado.
   */
  @Query(() => AcademyAfipSettings, {
    name: "afipSettings",
    nullable: true,
    description:
      "Obtiene la configuración AFIP de la academy (incluye onboardingStep)",
  })
  async getSettings(
    @CurrentUser() user: User,
  ): Promise<AcademyAfipSettings | null> {
    return this.afipSettingsService.getSettings(user.academyId);
  }

  /**
   * Step 1 — Guarda los datos fiscales (CUIT + condición impositiva).
   * Avanza el onboarding a DELEGATION_1 (Step 2).
   * Requiere feature flag AFIP habilitado.
   */
  @Mutation(() => AcademyAfipSettings, {
    description:
      "Step 1: Guarda datos fiscales y avanza onboarding a DELEGATION_1",
  })
  async setupAfipSettings(
    @Args("input") input: SetupAfipSettingsInput,
    @CurrentUser() user: User,
  ): Promise<AcademyAfipSettings> {
    return this.afipSettingsService.setupSettings(user.academyId, input);
  }

  /**
   * Step 2 — Confirma que el director ya delegó en ARCA.
   * Avanza el onboarding de DELEGATION_1 a DELEGATION_2.
   */
  @Mutation(() => AcademyAfipSettings, {
    description: "Step 2: Confirma que delegó en ARCA y avanza a DELEGATION_2",
  })
  async confirmAfipDelegationReady(
    @CurrentUser() user: User,
  ): Promise<AcademyAfipSettings> {
    return this.afipSettingsService.confirmDelegationReady(user.academyId);
  }

  /**
   * Step 3 — Verifica que la delegación WSFE esté activa.
   * Si es válida, avanza el onboarding de DELEGATION_2 a COMPLETED.
   */
  @Mutation(() => AcademyAfipSettings, {
    description:
      "Step 3: Verifica la delegación WSFE y avanza onboarding de DELEGATION_2 a COMPLETED",
  })
  async verifyAfipDelegation(
    @CurrentUser() user: User,
  ): Promise<AcademyAfipSettings> {
    return this.afipSettingsService.verifyDelegation(user.academyId);
  }
}
