import { InputType, Field } from "@nestjs/graphql";
import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

@InputType()
export class BulkInvoiceFilterInput {
  @Field({ description: "Periodo de facturación (formato YYYY-MM)" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "period debe tener formato YYYY-MM (ej: 2026-02)",
  })
  period: string;

  @Field({
    defaultValue: false,
    description:
      "Incluir cargos pendientes de periodos anteriores al seleccionado",
  })
  @IsBoolean()
  @IsOptional()
  includePastDue: boolean = false;

  @Field({ nullable: true, description: "Buscar por nombre o email" })
  @IsOptional()
  @IsString()
  search?: string;
}
