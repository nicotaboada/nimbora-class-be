import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { StudentsService } from "./students.service";
import { Student } from "./entities/student.entity";
import { CreateStudentInput } from "./dto/create-student.input";
import { UpdateStudentInput } from "./dto/update-student.input";
import { PaginatedStudents } from "./dto/paginated-students.output";
import { StudentStats } from "./entities/student-stats.entity";
import { StudentStatus } from "./entities/student.entity";

@Resolver(() => Student)
export class StudentsResolver {
  constructor(private readonly studentsService: StudentsService) {}

  @Mutation(() => Student)
  createStudent(
    @Args("createStudentInput") createStudentInput: CreateStudentInput,
  ) {
    return this.studentsService.create(createStudentInput);
  }

  @Query(() => Student, { name: "student" })
  findOne(@Args("id", { type: () => String }) id: string) {
    return this.studentsService.findOne(id);
  }

  @Query(() => PaginatedStudents, { name: "students" })
  findAll(
    @Args("page", { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
    @Args("search", { type: () => String, nullable: true }) search?: string,
    @Args("status", { type: () => StudentStatus, nullable: true })
    status?: StudentStatus,
  ) {
    return this.studentsService.findAll(page, limit, search, status);
  }

  @Mutation(() => Student)
  updateStudent(
    @Args("updateStudentInput") updateStudentInput: UpdateStudentInput,
  ) {
    return this.studentsService.update(updateStudentInput);
  }

  @Mutation(() => Student)
  removeStudent(@Args("id", { type: () => String }) id: string) {
    return this.studentsService.remove(id);
  }

  @Query(() => StudentStats, { name: "studentStats" })
  getStats() {
    return this.studentsService.getStats();
  }
}
