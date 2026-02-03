import { Type } from "@nestjs/common";
import { ObjectType, Field } from "@nestjs/graphql";
import { PaginationMeta } from "./pagination-meta.output";

/**
 * Factory function para crear tipos paginados genéricos.
 *
 * @example
 * @ObjectType()
 * export class PaginatedInvoices extends Paginated(Invoice) {}
 */
export function Paginated<T>(
  classRef: Type<T>,
): Type<{ data: T[]; meta: PaginationMeta }> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [classRef], { description: "Lista de items" })
    data: T[];

    @Field(() => PaginationMeta, { description: "Metadata de paginación" })
    meta: PaginationMeta;
  }
  return PaginatedType as Type<{ data: T[]; meta: PaginationMeta }>;
}
