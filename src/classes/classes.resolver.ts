import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ClassesService } from "./classes.service";
import { ClassEntity } from "./entities/class.entity";
import { PaginatedClasses } from "./dto/paginated-classes.output";
import { CreateClassInput } from "./dto/create-class.input";
import { ClassesFilterInput } from "./dto/classes-filter.input";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../users/entities/user.entity";

@Resolver(() => ClassEntity)
@UseGuards(SupabaseAuthGuard)
export class ClassesResolver {
  constructor(private readonly classesService: ClassesService) {}

  @Mutation(() => ClassEntity)
  createClass(
    @Args("createClassInput") createClassInput: CreateClassInput,
    @CurrentUser() user: User,
  ): Promise<ClassEntity> {
    return this.classesService.create(createClassInput, user.academyId);
  }

  @Query(() => PaginatedClasses, { name: "classes" })
  findAll(
    @Args("filter", { nullable: true }) filter?: ClassesFilterInput,
    @CurrentUser() user?: User,
  ): Promise<PaginatedClasses> {
    return this.classesService.findAll(filter, user!.academyId);
  }
}
