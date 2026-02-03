import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { PaymentMethod } from "../enums/payment-method.enum";
import { PaymentStatus } from "../enums/payment-status.enum";
import { PaymentType } from "../enums/payment-type.enum";

@ObjectType({ description: "Pago de una factura" })
export class Payment {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { description: "ID de la factura asociada" })
  invoiceId: string;

  @Field(() => PaymentType, { description: "Tipo de movimiento" })
  type: PaymentType;

  @Field(() => Int, { description: "Monto en centavos (siempre positivo)" })
  amount: number;

  @Field(() => PaymentMethod, { description: "Método de pago" })
  method: PaymentMethod;

  @Field(() => PaymentStatus, { description: "Estado del pago" })
  status: PaymentStatus;

  @Field({ description: "Fecha real del pago" })
  paidAt: Date;

  @Field({ nullable: true, description: "Referencia del pago" })
  reference?: string;

  @Field({ nullable: true, description: "Razón de anulación/rechazo" })
  voidReason?: string;

  @Field({ nullable: true, description: "Fecha de anulación" })
  voidedAt?: Date;

  @Field({ description: "Fecha de creación" })
  createdAt: Date;

  @Field({ description: "Fecha de última actualización" })
  updatedAt: Date;
}
