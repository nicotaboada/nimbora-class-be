import { ObjectType, Field } from "@nestjs/graphql";
import { Student } from "../entities/student.entity";
import { PaginationMeta } from "../../common/dto/pagination-meta.output";

@ObjectType()
export class PaginatedStudents {
  @Field(() => [Student], { description: "Lista de estudiantes" })
  data: Student[];

  @Field(() => PaginationMeta, { description: "Metadata de paginación" })
  meta: PaginationMeta;
}
