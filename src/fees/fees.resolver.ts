import { Resolver, Query, Mutation, Args, Int, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { Fee } from "./entities/fee.entity";
import { PaginatedFees } from "./dto/paginated-fees.output";
import { CreateOneOffFeeInput } from "./dto/create-one-off-fee.input";
import { CreateMonthlyFeeInput } from "./dto/create-monthly-fee.input";
import { CreatePeriodicFeeInput } from "./dto/create-periodic-fee.input";
import { UpdateOneOffFeeInput } from "./dto/update-one-off-fee.input";
import { UpdateMonthlyFeeInput } from "./dto/update-monthly-fee.input";
import { UpdatePeriodicFeeInput } from "./dto/update-periodic-fee.input";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../users/entities/user.entity";

@Resolver(() => Fee)
@UseGuards(SupabaseAuthGuard)
export class FeesResolver {
  constructor(private readonly feesService: FeesService) {}

  @Mutation(() => Fee)
  createOneOffFee(
    @Args("input") input: CreateOneOffFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.createOneOffFee(input, user.academyId);
  }

  @Mutation(() => Fee)
  createMonthlyFee(
    @Args("input") input: CreateMonthlyFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.createMonthlyFee(input, user.academyId);
  }

  @Mutation(() => Fee)
  createPeriodicFee(
    @Args("input") input: CreatePeriodicFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.createPeriodicFee(input, user.academyId);
  }

  @Query(() => Fee, { name: "fee" })
  findOne(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.feesService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedFees, { name: "fees" })
  findAll(
    @CurrentUser() user: User,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ) {
    return this.feesService.findAll(user.academyId, page, limit);
  }

  @Mutation(() => Fee)
  updateOneOffFee(
    @Args("input") input: UpdateOneOffFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.updateOneOffFee(input, user.academyId);
  }

  @Mutation(() => Fee)
  updateMonthlyFee(
    @Args("input") input: UpdateMonthlyFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.updateMonthlyFee(input, user.academyId);
  }

  @Mutation(() => Fee)
  updatePeriodicFee(
    @Args("input") input: UpdatePeriodicFeeInput,
    @CurrentUser() user: User,
  ) {
    return this.feesService.updatePeriodicFee(input, user.academyId);
  }

  @Mutation(() => Fee)
  deleteFee(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.feesService.remove(id, user.academyId);
  }
}
