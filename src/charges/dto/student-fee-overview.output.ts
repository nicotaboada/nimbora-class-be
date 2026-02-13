import { ObjectType, Field, Int } from "@nestjs/graphql";
import { FeeType } from "../../fees/enums/fee-type.enum";
import { FeeInvoicingStatus } from "../enums/fee-invoicing-status.enum";

@ObjectType()
export class StudentFeeOverview {
  @Field({ description: "ID del fee" })
  feeId: string;

  @Field({ description: "Descripción del fee (ej: Matrícula 2026)" })
  feeDescription: string;

  @Field(() => FeeType, { description: "Tipo de fee (ONE_OFF, MONTHLY, etc)" })
  feeType: FeeType;

  @Field(() => Int, { description: "Cantidad total de cuotas" })
  chargeCount: number;

  @Field(() => Int, {
    description: "Monto total en centavos (suma de todas las cuotas)",
  })
  totalAmount: number;

  @Field(() => FeeInvoicingStatus, {
    description: "Estado de facturación del grupo de cuotas",
  })
  invoicingStatus: FeeInvoicingStatus;

  @Field(() => Int, {
    description: "Cantidad de cuotas pendientes (futuras, issueDate > hoy)",
  })
  pendingChargeCount: number;

  @Field(() => Int, {
    description:
      "Cantidad de cuotas que requieren facturación (PENDING con issueDate <= hoy)",
  })
  actionRequiredChargeCount: number;

  @Field(() => Int, {
    description: "Cantidad de cuotas facturadas (INVOICED o PAID)",
  })
  invoicedChargeCount: number;

  @Field({
    description:
      "Indica si tiene al menos una cuota que requiere facturación (PENDING con issueDate <= hoy)",
  })
  hasChargesRequiringAction: boolean;

  @Field({
    nullable: true,
    description: "Próxima fecha de emisión de cuotas pendientes",
  })
  nextIssueDate?: Date;
}
