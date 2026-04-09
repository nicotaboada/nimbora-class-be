import { ObjectType, Field } from "@nestjs/graphql";
import { Student } from "../../students/entities/student.entity";
import { PaginationMeta } from "../../common/dto/pagination-meta.output";

@ObjectType()
export class PaginatedClassStudents {
  @Field(() => [Student], { description: "Lista de estudiantes en la clase" })
  data: Student[];

  @Field(() => PaginationMeta, { description: "Metadata de paginación" })
  meta: PaginationMeta;
}
