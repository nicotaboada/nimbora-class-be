import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ClassesService } from "./classes.service";
import { ClassEntity } from "./entities/class.entity";
import { PaginatedClasses } from "./dto/paginated-classes.output";
import { PaginatedClassStudents } from "./dto/paginated-class-students.output";
import { CreateClassInput } from "./dto/create-class.input";
import { UpdateClassInput } from "./dto/update-class.input";
import { AssignStudentsToClassInput } from "./dto/assign-students-to-class.input";
import { AvailableStudentsFilterInput } from "./dto/available-students-filter.input";
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

  @Mutation(() => ClassEntity)
  updateClass(
    @Args("updateClassInput") updateClassInput: UpdateClassInput,
    @CurrentUser() user: User,
  ): Promise<ClassEntity> {
    return this.classesService.update(
      updateClassInput.id,
      updateClassInput,
      user.academyId,
    );
  }

  @Query(() => ClassEntity, { name: "class" })
  findOne(
    @Args("id") id: string,
    @CurrentUser() user: User,
  ): Promise<ClassEntity> {
    return this.classesService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedClasses, { name: "classes" })
  findAll(
    @CurrentUser() user: User,
    @Args("filter", { nullable: true }) filter?: ClassesFilterInput,
  ): Promise<PaginatedClasses> {
    return this.classesService.findAll(filter, user.academyId);
  }

  @Mutation(() => ClassEntity)
  assignStudentsToClass(
    @Args("assignStudentsToClassInput") input: AssignStudentsToClassInput,
    @CurrentUser() user: User,
  ): Promise<ClassEntity> {
    return this.classesService.assignStudents(input, user.academyId);
  }

  @Mutation(() => ClassEntity)
  removeStudentFromClass(
    @Args("classId") classId: string,
    @Args("studentId") studentId: string,
    @CurrentUser() user: User,
  ): Promise<ClassEntity> {
    return this.classesService.removeStudentFromClass(
      classId,
      studentId,
      user.academyId,
    );
  }

  @Query(() => PaginatedClassStudents)
  classStudents(
    @Args("classId") classId: string,
    @Args("page", { type: () => Int, defaultValue: 1 }) page: number,
    @Args("limit", { type: () => Int, defaultValue: 10 }) limit: number,
    @Args("search", { nullable: true }) search: string | undefined,
    @CurrentUser() user: User,
  ): Promise<PaginatedClassStudents> {
    return this.classesService.findStudentsByClass(
      classId,
      user.academyId,
      page,
      limit,
      search,
    );
  }

  @Query(() => PaginatedClassStudents)
  availableStudentsForClass(
    @Args("classId") classId: string,
    @CurrentUser() user: User,
    @Args("filter", { nullable: true }) filter?: AvailableStudentsFilterInput,
  ): Promise<PaginatedClassStudents> {
    return this.classesService.findAvailableStudentsForClass(
      classId,
      user.academyId,
      filter ?? {},
    );
  }

  @Query(() => [ClassEntity], { name: "classesByStudent" })
  findByStudent(
    @Args("studentId") studentId: string,
    @CurrentUser() user: User,
  ): Promise<ClassEntity[]> {
    return this.classesService.findByStudent(studentId, user.academyId);
  }
}
