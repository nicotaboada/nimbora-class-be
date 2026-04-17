import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "src/auth/guards/supabase-auth.guard";
import { User } from "src/users/entities/user.entity";
import { TeachersService } from "./teachers.service";
import { Teacher, TeacherStats } from "./entities/teacher.entity";
import { PaginatedTeachers } from "./dto/paginated-teachers.output";
import { CreateTeacherInput } from "./dto/create-teacher.input";
import { UpdateTeacherInput } from "./dto/update-teacher.input";
import { UpdateTeacherContactInfoInput } from "./dto/update-teacher-contact-info.input";
import { Status } from "src/common/enums";
import { ClassesService } from "src/classes/classes.service";
import { ClassEntity } from "src/classes/entities/class.entity";

@Resolver(() => Teacher)
@UseGuards(SupabaseAuthGuard)
export class TeachersResolver {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly classesService: ClassesService,
  ) { }

  @Mutation(() => Teacher)
  async createTeacher(
    @Args("createTeacherInput") createTeacherInput: CreateTeacherInput,
    @CurrentUser() user: User,
  ): Promise<Teacher> {
    return this.teachersService.create(createTeacherInput, user.academyId);
  }

  @Query(() => Teacher, { name: "teacher" })
  async findOne(
    @Args("id", { type: () => String }) id: string,
    @CurrentUser() user: User,
  ): Promise<Teacher> {
    return this.teachersService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedTeachers, { name: "teachers" })
  async findAll(
    @Args("page", { type: () => Int }) page: number,
    @Args("limit", { type: () => Int }) limit: number,
    @CurrentUser() user: User,
    @Args("search", { type: () => String, nullable: true }) search?: string,
    @Args("status", { type: () => Status, nullable: true })
    status?: Status,
    @Args("classId", { type: () => String, nullable: true })
    classId?: string,
  ): Promise<any> {
    return this.teachersService.findAll(
      page,
      limit,
      user.academyId,
      search,
      status,
      classId,
    );
  }

  @Mutation(() => Teacher)
  async updateTeacher(
    @Args("updateTeacherInput") updateTeacherInput: UpdateTeacherInput,
    @CurrentUser() user: User,
  ): Promise<Teacher> {
    return this.teachersService.update(updateTeacherInput, user.academyId);
  }

  @Mutation(() => Teacher)
  async removeTeacher(
    @Args("id", { type: () => String }) id: string,
    @CurrentUser() user: User,
  ): Promise<Teacher> {
    return this.teachersService.remove(id, user.academyId);
  }

  @Query(() => TeacherStats, { name: "teacherStats" })
  async getStats(@CurrentUser() user: User): Promise<TeacherStats> {
    return this.teachersService.getStats(user.academyId);
  }

  @Mutation(() => Teacher)
  async updateTeacherContactInfo(
    @Args("input") input: UpdateTeacherContactInfoInput,
    @CurrentUser() user: User,
  ): Promise<Teacher> {
    return this.teachersService.updateContactInfo(input, user.academyId);
  }

  @ResolveField(() => [ClassEntity], { name: "classes" })
  async classes(@Parent() teacher: Teacher): Promise<ClassEntity[]> {
    const result = await this.classesService.findAll(
      { teacherId: teacher.id },
      teacher.academyId,
    );
    return result.data;
  }
}
