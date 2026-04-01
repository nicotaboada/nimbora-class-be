import { ObjectType, Field } from "@nestjs/graphql";
import { Teacher } from "../entities/teacher.entity";
import { PaginationMeta } from "src/common/dto/pagination-meta.output";

@ObjectType()
export class PaginatedTeachers {
  @Field(() => [Teacher])
  data: Teacher[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
