import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { BillingProfilesService } from "./billing-profiles.service";
import { BillingProfile } from "./entities/billing-profile.entity";
import { UpsertBillingProfileInput } from "./dto/upsert-billing-profile.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => BillingProfile)
@UseGuards(SupabaseAuthGuard)
export class BillingProfilesResolver {
  constructor(
    private readonly billingProfilesService: BillingProfilesService,
  ) {}

  /**
   * Obtiene los billing profiles (datos fiscales) de un alumno.
   */
  @Query(() => [BillingProfile], {
    name: "billingProfilesByStudent",
    description: "Obtiene los perfiles de facturación de un alumno",
  })
  async findByStudent(
    @Args("studentId", { description: "ID del alumno" }) studentId: string,
    @CurrentUser() user: User,
  ): Promise<BillingProfile[]> {
    return this.billingProfilesService.findByStudent(studentId, user.academyId);
  }

  /**
   * Obtiene un billing profile por ID.
   */
  @Query(() => BillingProfile, {
    name: "billingProfile",
    description: "Obtiene un perfil de facturación por ID",
  })
  async findOne(
    @Args("id", { description: "ID del billing profile" }) id: string,
    @CurrentUser() user: User,
  ): Promise<BillingProfile> {
    return this.billingProfilesService.findOne(id, user.academyId);
  }

  /**
   * Crea o actualiza un billing profile (datos fiscales) de un alumno.
   * Si input.id viene, es un update; si no, es un create.
   */
  @Mutation(() => BillingProfile, {
    description: "Crea o actualiza un perfil de facturación de un alumno",
  })
  async upsertBillingProfile(
    @Args("input") input: UpsertBillingProfileInput,
    @CurrentUser() user: User,
  ): Promise<BillingProfile> {
    return this.billingProfilesService.upsert(user.academyId, input);
  }
}
