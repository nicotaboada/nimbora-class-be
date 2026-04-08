import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { FamiliesService } from "./families.service";
import { PaginatedFamilies } from "./dto/paginated-families.output";
import { Family } from "./entities/family.entity";
import { Guardian } from "./entities/guardian.entity";
import { CreateFamilyInput } from "./dto/create-family.input";
import { CreateGuardianInput } from "./dto/create-guardian.input";
import { UpdateGuardianInput } from "./dto/update-guardian.input";
import { UpdateGuardianNotificationsInput } from "./dto/update-guardian-notifications.input";
import { SetFamilyStudentsInput } from "./dto/add-students-to-family.input";
import { AvailableStudentsForFamilyInput } from "./dto/available-students-for-family.input";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { PaginatedStudents } from "../students/dto/paginated-students.output";

@Resolver()
@UseGuards(SupabaseAuthGuard)
export class FamiliesResolver {
  constructor(private readonly familiesService: FamiliesService) {}

  @Query(() => Family, { name: "family" })
  async findOne(
    @Args("id") id: string,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedFamilies, { name: "families" })
  async findAll(
    @CurrentUser() user: User,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
    @Args("search", { type: () => String, nullable: true })
    search?: string,
  ) {
    return this.familiesService.findAll(user.academyId, page, limit, search);
  }

  @Mutation(() => Family)
  async createFamily(
    @Args("createFamilyInput") input: CreateFamilyInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.create(input, user.academyId);
  }

  @Mutation(() => Guardian)
  async createGuardian(
    @Args("createGuardianInput") input: CreateGuardianInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.createGuardian(input, user.academyId);
  }

  @Query(() => PaginatedStudents, { name: "familyStudents" })
  async familyStudents(
    @Args("familyId") familyId: string,
    @CurrentUser() user: User,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
    @Args("search", { type: () => String, nullable: true })
    search?: string,
  ) {
    return this.familiesService.familyStudents(
      familyId,
      user.academyId,
      page,
      limit,
      search,
    );
  }

  @Query(() => PaginatedStudents, { name: "availableStudentsForFamily" })
  async availableStudentsForFamily(
    @Args("familyId") familyId: string,
    @Args("filter", { nullable: true })
    filter: AvailableStudentsForFamilyInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.availableStudentsForFamily(
      familyId,
      user.academyId,
      filter,
    );
  }

  @Mutation(() => Family)
  async setFamilyStudents(
    @Args("setFamilyStudentsInput") input: SetFamilyStudentsInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.setFamilyStudents(
      input.familyId,
      input.studentIds,
      user.academyId,
    );
  }

  @Mutation(() => Guardian)
  async updateGuardian(
    @Args("updateGuardianInput") input: UpdateGuardianInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.updateGuardian(
      input.id,
      input,
      user.academyId,
    );
  }

  @Mutation(() => Guardian)
  async updateGuardianNotifications(
    @Args("input") input: UpdateGuardianNotificationsInput,
    @CurrentUser() user: User,
  ) {
    return this.familiesService.updateGuardianNotifications(
      input,
      user.academyId,
    );
  }
}
