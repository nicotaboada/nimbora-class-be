import { InputType, Field, Int } from "@nestjs/graphql";
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

@InputType({
  description: "Input para crear facturas electrónicas AFIP en bulk",
})
export class BulkCreateAfipInvoicesInput {
  @Field(() => [String], { description: "IDs de facturas internas a emitir" })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  invoiceIds: string[];

  @Field(() => Int, { description: "Punto de venta AFIP" })
  @IsInt()
  @Min(1)
  ptoVta: number;

  @Field({ description: "Fecha de emisión del comprobante" })
  @IsDate()
  @Type(() => Date)
  cbteFch: Date;
}
