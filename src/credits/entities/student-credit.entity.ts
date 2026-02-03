import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { CreditStatus } from "../enums/credit-status.enum";

@ObjectType({ description: "Crédito a favor de un estudiante" })
export class StudentCredit {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { description: "ID del estudiante" })
  studentId: string;

  @Field(() => Int, { description: "Monto original del crédito en centavos" })
  amount: number;

  @Field(() => Int, {
    description: "Monto disponible para usar en centavos",
  })
  availableAmount: number;

  @Field(() => CreditStatus, { description: "Estado del crédito" })
  status: CreditStatus;

  @Field(() => ID, { description: "ID del pago que generó el crédito" })
  sourcePaymentId: string;

  @Field(() => ID, { description: "ID de la factura donde se generó" })
  sourceInvoiceId: string;

  @Field({ description: "Fecha de creación" })
  createdAt: Date;

  @Field({ description: "Fecha de última actualización" })
  updatedAt: Date;
}
