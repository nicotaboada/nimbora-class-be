import { InputType, Field } from "@nestjs/graphql";
import {
  IsUUID,
  IsDate,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { BulkInvoiceItem } from "../types/bulk-invoice.types";

@InputType()
export class BulkInvoiceItemInput implements BulkInvoiceItem {
  @Field({ description: "ID del estudiante" })
  @IsUUID("4")
  studentId: string;

  @Field(() => [String], {
    description: "IDs de los charges a facturar",
  })
  @IsUUID("4", { each: true })
  @ArrayMinSize(1, {
    message: "Cada estudiante debe tener al menos un charge",
  })
  chargeIds: string[];
}

@InputType()
export class BulkCreateInvoicesInput {
  @Field(() => [BulkInvoiceItemInput], {
    description: "Lista de estudiantes con sus charges a facturar",
  })
  @ValidateNested({ each: true })
  @Type(() => BulkInvoiceItemInput)
  @ArrayMinSize(1, { message: "Debe incluir al menos un estudiante" })
  items: BulkInvoiceItemInput[];

  @Field({ description: "Fecha de vencimiento para todas las facturas" })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @Field({
    defaultValue: false,
    description: "Enviar notificación a los estudiantes al crear las facturas",
  })
  @IsBoolean()
  @IsOptional()
  notify: boolean = false;
}
