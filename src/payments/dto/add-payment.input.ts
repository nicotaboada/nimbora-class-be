import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsUUID,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
} from "class-validator";
import { PaymentMethod } from "../enums/payment-method.enum";

@InputType({ description: "Input para agregar un pago" })
export class AddPaymentInput {
  @Field(() => ID, { description: "ID de la factura" })
  @IsUUID("4")
  invoiceId: string;

  @Field(() => Int, { description: "Monto en centavos" })
  @IsInt()
  @Min(1, { message: "El monto debe ser mayor a 0" })
  amount: number;

  @Field(() => PaymentMethod, { description: "Método de pago" })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @Field({ description: "Fecha del pago" })
  @IsDateString()
  paidAt: Date;

  @Field({ nullable: true, description: "Referencia del pago" })
  @IsOptional()
  @IsString()
  reference?: string;
}
