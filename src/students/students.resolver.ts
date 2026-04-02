import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { Student } from "./entities/student.entity";
import { CreateStudentInput } from "./dto/create-student.input";
import { UpdateStudentInput } from "./dto/update-student.input";
import { PaginatedStudents } from "./dto/paginated-students.output";
import { StudentStats } from "./entities/student-stats.entity";
import { Status } from "../common/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../users/entities/user.entity";

@Resolver(() => Student)
@UseGuards(SupabaseAuthGuard)
export class StudentsResolver {
  constructor(private readonly studentsService: StudentsService) {}

  @Mutation(() => Student)
  createStudent(
    @Args("createStudentInput") createStudentInput: CreateStudentInput,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.create(createStudentInput, user.academyId);
  }

  @Query(() => Student, { name: "student" })
  findOne(
    @Args("id", { type: () => String }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.findOne(id, user.academyId);
  }

  @Query(() => PaginatedStudents, { name: "students" })
  findAll(
    @CurrentUser() user: User,
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
    @Args("search", { type: () => String, nullable: true }) search?: string,
    @Args("status", { type: () => Status, nullable: true })
    status?: Status,
  ) {
    return this.studentsService.findAll(
      user.academyId,
      page,
      limit,
      search,
      status,
    );
  }

  @Mutation(() => Student)
  updateStudent(
    @Args("updateStudentInput") updateStudentInput: UpdateStudentInput,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.update(updateStudentInput, user.academyId);
  }

  @Mutation(() => Student)
  removeStudent(
    @Args("id", { type: () => String }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.remove(id, user.academyId);
  }

  @Query(() => StudentStats, { name: "studentStats" })
  getStats(@CurrentUser() user: User) {
    return this.studentsService.getStats(user.academyId);
  }
}
