import { InputType, Field } from "@nestjs/graphql";
import { IsUUID, IsBoolean, Matches, IsOptional } from "class-validator";

@InputType()
export class ChargesForInvoiceInput {
  @Field({ description: "ID del estudiante" })
  @IsUUID("4")
  studentId: string;

  @Field({ description: "Mes de facturación (formato YYYY-MM, ej: 2026-12)" })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "invoiceMonth debe tener formato YYYY-MM (ej: 2026-12)",
  })
  invoiceMonth: string;

  @Field({
    description: "Incluir cargos vencidos de meses anteriores",
    defaultValue: false,
  })
  @IsBoolean()
  @IsOptional()
  includePastDue: boolean = false;
}
