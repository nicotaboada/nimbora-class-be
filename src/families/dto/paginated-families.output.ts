import { ObjectType, Field } from "@nestjs/graphql";
import { PaginationMeta } from "../../common/dto/pagination-meta.output";
import { Family } from "../entities/family.entity";

@ObjectType()
export class PaginatedFamilies {
  @Field(() => [Family])
  data: Family[];

  @Field()
  meta: PaginationMeta;
}
