import { InputType, Field } from "@nestjs/graphql";
import { IsBoolean, IsOptional, IsString, Matches } from "class-validator";

@InputType({
  description: "Filtros para listar facturas elegibles para emisión AFIP",
})
export class InvoicesForBulkAfipInput {
  @Field({
    nullable: true,
    description: "Periodo de facturación (formato YYYY-MM)",
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "period debe tener formato YYYY-MM (ej: 2026-03)",
  })
  period?: string;

  @Field({
    nullable: true,
    defaultValue: false,
    description:
      "Si es true, incluye facturas del período seleccionado y anteriores",
  })
  @IsOptional()
  @IsBoolean()
  includePastDue?: boolean;

  @Field({ nullable: true, description: "Buscar por nombre del alumno" })
  @IsOptional()
  @IsString()
  search?: string;
}
