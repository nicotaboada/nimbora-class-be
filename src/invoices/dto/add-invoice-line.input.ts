import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateInvoiceLineInput } from "./create-invoice-line.input";

@InputType()
export class AddInvoiceLineInput {
  @Field({ description: "ID de la factura" })
  @IsNotEmpty()
  @IsUUID()
  invoiceId: string;

  @Field(() => CreateInvoiceLineInput, { description: "Datos de la línea" })
  @ValidateNested()
  @Type(() => CreateInvoiceLineInput)
  line: CreateInvoiceLineInput;
}
