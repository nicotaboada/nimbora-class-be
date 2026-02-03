import { InputType, Field, Int } from "@nestjs/graphql";
import { IsOptional, IsInt, Min, Max } from "class-validator";

/**
 * Input base para paginación.
 * Extender esta clase para agregar filtros específicos.
 *
 * @example
 * @InputType()
 * export class MyFilterInput extends PaginationInput {
 *   @Field({ nullable: true })
 *   search?: string;
 *
 *   // Override del limit default si necesario:
 *   @Field(() => Int, { nullable: true, defaultValue: 20 })
 *   limit?: number = 20;
 * }
 */
@InputType({ isAbstract: true })
export class PaginationInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: "Número de página (desde 1)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 10,
    description: "Cantidad de items por página (máx 100)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
