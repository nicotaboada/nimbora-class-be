import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ChargeStatus } from "../enums/charge-status.enum";
import { ChargeInvoicingState } from "../enums/charge-invoicing-state.enum";
import { ChargeFee } from "./charge-fee.entity";

@ObjectType()
export class Charge {
  @Field()
  id: string;

  @Field()
  feeId: string;

  @Field(() => ChargeFee, {
    nullable: true,
    description: "Fee (Cargo) asociado",
  })
  fee?: ChargeFee;

  @Field()
  studentId: string;

  @Field(() => Int, {
    description: "Monto en centavos (snapshot del Fee.cost)",
  })
  amount: number;

  @Field({ description: "Mes al que pertenece el cargo (formato YYYY-MM)" })
  periodMonth: string;

  @Field(() => Int, { description: "Número de cuota (1, 2, 3... N)" })
  installmentNumber: number;

  @Field({ description: "Fecha de emisión del cargo" })
  issueDate: Date;

  @Field({ description: "Fecha de vencimiento del cargo" })
  dueDate: Date;

  @Field(() => ChargeStatus)
  status: ChargeStatus;

  @Field(() => ChargeInvoicingState, {
    description:
      "Estado visual de facturación: PENDING (futuro), REQUIRES_INVOICING (a facturar), INVOICED (facturado)",
  })
  invoicingState: ChargeInvoicingState;

  @Field({
    description:
      "Indica si el cargo está vencido (dueDate < hoy y status === PENDING)",
  })
  isOverdue: boolean;

  @Field({
    nullable: true,
    description:
      "ID de la factura asociada (solo presente si el cargo fue facturado)",
  })
  invoiceId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
