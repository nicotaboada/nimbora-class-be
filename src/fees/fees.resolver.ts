import { Resolver, Query, Mutation, Args, Int, ID } from "@nestjs/graphql";
import { FeesService } from "./fees.service";
import { Fee } from "./entities/fee.entity";
import { PaginatedFees } from "./dto/paginated-fees.output";
import { CreateOneOffFeeInput } from "./dto/create-one-off-fee.input";
import { CreateMonthlyFeeInput } from "./dto/create-monthly-fee.input";
import { CreatePeriodicFeeInput } from "./dto/create-periodic-fee.input";
import { UpdateOneOffFeeInput } from "./dto/update-one-off-fee.input";
import { UpdateMonthlyFeeInput } from "./dto/update-monthly-fee.input";
import { UpdatePeriodicFeeInput } from "./dto/update-periodic-fee.input";

@Resolver(() => Fee)
export class FeesResolver {
  constructor(private readonly feesService: FeesService) {}

  @Mutation(() => Fee)
  createOneOffFee(@Args("input") input: CreateOneOffFeeInput) {
    return this.feesService.createOneOffFee(input);
  }

  @Mutation(() => Fee)
  createMonthlyFee(@Args("input") input: CreateMonthlyFeeInput) {
    return this.feesService.createMonthlyFee(input);
  }

  @Mutation(() => Fee)
  createPeriodicFee(@Args("input") input: CreatePeriodicFeeInput) {
    return this.feesService.createPeriodicFee(input);
  }

  @Query(() => Fee, { name: "fee" })
  findOne(@Args("id", { type: () => ID }) id: string) {
    return this.feesService.findOne(id);
  }

  @Query(() => PaginatedFees, { name: "fees" })
  findAll(
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ) {
    return this.feesService.findAll(page, limit);
  }

  @Mutation(() => Fee)
  updateOneOffFee(@Args("input") input: UpdateOneOffFeeInput) {
    return this.feesService.updateOneOffFee(input);
  }

  @Mutation(() => Fee)
  updateMonthlyFee(@Args("input") input: UpdateMonthlyFeeInput) {
    return this.feesService.updateMonthlyFee(input);
  }

  @Mutation(() => Fee)
  updatePeriodicFee(@Args("input") input: UpdatePeriodicFeeInput) {
    return this.feesService.updatePeriodicFee(input);
  }

  @Mutation(() => Fee)
  deleteFee(@Args("id", { type: () => ID }) id: string) {
    return this.feesService.remove(id);
  }
}
