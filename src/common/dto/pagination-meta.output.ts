import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class PaginationMeta {
  @Field(() => Int, { description: "Total de registros en la base de datos" })
  total: number;

  @Field(() => Int, { description: "Página actual" })
  page: number;

  @Field(() => Int, { description: "Límite de items por página" })
  limit: number;

  @Field(() => Int, { description: "Total de páginas disponibles" })
  totalPages: number;

  @Field({ description: "Indica si hay una página siguiente" })
  hasNextPage: boolean;

  @Field({ description: "Indica si hay una página anterior" })
  hasPreviousPage: boolean;
}
