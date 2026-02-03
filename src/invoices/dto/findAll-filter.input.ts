import { InputType, Field, ID } from "@nestjs/graphql";
import { IsOptional, IsUUID, IsString, IsDate } from "class-validator";
import { Type } from "class-transformer";
import { InvoiceStatus } from "../enums/invoice-status.enum";
import { PaginationInput } from "../../common/dto/pagination.input";

/**
 * Filtros para la query de listado de facturas.
 * Hereda page y limit de PaginationInput.
 */
@InputType({ description: "Filtros para listar facturas" })
export class InvoicesFilterInput extends PaginationInput {
  @Field(() => ID, { nullable: true, description: "Filtrar por ID de alumno" })
  @IsOptional()
  @IsUUID("4")
  studentId?: string;

  @Field(() => InvoiceStatus, {
    nullable: true,
    description: "Filtrar por estado",
  })
  @IsOptional()
  status?: InvoiceStatus;

  @Field({
    nullable: true,
    description: "Buscar en recipientName (búsqueda parcial, case-insensitive)",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({
    nullable: true,
    description: "Fecha de emisión desde (inclusive)",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDateFrom?: Date;

  @Field({
    nullable: true,
    description: "Fecha de emisión hasta (inclusive)",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDateTo?: Date;
}
