import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Charge } from "../entities/charge.entity";

@ObjectType()
export class StudentChargesOverview {
  @Field(() => Int, {
    description:
      "Total en centavos de cargos que requieren facturación (PENDING con issueDate <= hoy)",
  })
  requiresInvoicingTotal: number;

  @Field(() => Int, {
    description: "Total en centavos de cargos facturados (INVOICED o PAID)",
  })
  invoicedTotal: number;

  @Field(() => Int, {
    description:
      "Total general en centavos (requiresInvoicingTotal + invoicedTotal)",
  })
  totalAmount: number;

  @Field(() => [Charge], {
    description:
      "Los 3 cargos más urgentes que requieren facturación (ordenados por dueDate ASC)",
  })
  requiresInvoicingCharges: Charge[];

  @Field(() => [Charge], {
    description:
      "Los 3 cargos facturados más recientes (ordenados por dueDate DESC)",
  })
  invoicedCharges: Charge[];
}
