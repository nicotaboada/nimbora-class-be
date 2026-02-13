import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { FeatureFlagsService } from "./feature-flags.service";
import { AcademyFeature } from "./entities/academy-feature.entity";
import { SetFeatureFlagInput } from "./dto/set-feature-flag.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => AcademyFeature)
@UseGuards(SupabaseAuthGuard)
export class FeatureFlagsResolver {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * Habilita o deshabilita un feature flag para la academy del usuario.
   */
  @Mutation(() => AcademyFeature, {
    description: "Habilita o deshabilita un feature flag",
  })
  async setFeatureFlag(
    @Args("input") input: SetFeatureFlagInput,
    @CurrentUser() user: User,
  ): Promise<AcademyFeature> {
    return this.featureFlagsService.setFlag(
      user.academyId,
      input.key,
      input.enabled,
    );
  }

  /**
   * Lista todos los feature flags de la academy del usuario.
   */
  @Query(() => [AcademyFeature], {
    name: "featureFlags",
    description: "Lista todos los feature flags de la academy",
  })
  async findAll(@CurrentUser() user: User): Promise<AcademyFeature[]> {
    return this.featureFlagsService.getFlags(user.academyId);
  }

  /**
   * Verifica si un feature específico está habilitado.
   */
  @Query(() => Boolean, {
    name: "isFeatureEnabled",
    description: "Verifica si un feature está habilitado",
  })
  async isEnabled(
    @Args("key") key: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.featureFlagsService.isEnabled(user.academyId, key);
  }
}
