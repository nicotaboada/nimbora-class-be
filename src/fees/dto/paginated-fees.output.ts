import { ObjectType, Field } from "@nestjs/graphql";
import { Fee } from "../entities/fee.entity";
import { PaginationMeta } from "../../common/dto/pagination-meta.output";

@ObjectType()
export class PaginatedFees {
  @Field(() => [Fee], { description: "Lista de fees" })
  data: Fee[];

  @Field(() => PaginationMeta, { description: "Metadata de paginación" })
  meta: PaginationMeta;
}
