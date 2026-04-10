import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { UseGuards, Logger } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { ClassesService } from "../classes/classes.service";
import { Student } from "./entities/student.entity";
import { ClassEntity } from "../classes/entities/class.entity";
import { CreateStudentInput } from "./dto/create-student.input";
import { UpdateStudentInput } from "./dto/update-student.input";
import { UpdateStudentPersonalInfoInput } from "./dto/update-student-personal-info.input";
import { UpdateStudentContactInfoInput } from "./dto/update-student-contact-info.input";
import { PaginatedStudents } from "./dto/paginated-students.output";
import { StudentStats } from "./entities/student-stats.entity";
import { Status } from "../common/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../users/entities/user.entity";

@Resolver(() => Student)
@UseGuards(SupabaseAuthGuard)
export class StudentsResolver {
  private readonly logger = new Logger(StudentsResolver.name);
  constructor(
    private readonly studentsService: StudentsService,
    private readonly classesService: ClassesService,
  ) {}

  @ResolveField(() => [ClassEntity])
  classes(
    @Parent() student: Student,
    @CurrentUser() user: User,
  ): Promise<ClassEntity[]> {
    return this.classesService.findByStudent(student.id, user.academyId);
  }

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
  updateStudentPersonalInfo(
    @Args("input") input: UpdateStudentPersonalInfoInput,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.updatePersonalInfo(input, user.academyId);
  }

  @Mutation(() => Student)
  updateStudentContactInfo(
    @Args("input") input: UpdateStudentContactInfoInput,
    @CurrentUser() user: User,
  ) {
    return this.studentsService.updateContactInfo(input, user.academyId);
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
