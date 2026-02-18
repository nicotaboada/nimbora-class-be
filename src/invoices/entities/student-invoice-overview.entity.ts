import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Invoice } from "./invoice.entity";

@ObjectType()
export class StudentInvoiceOverview {
  @Field(() => [Invoice], {
    description: "Las 3 facturas impagas más antiguas vencidas",
  })
  unpaidInvoices: Invoice[];

  @Field(() => [Invoice], {
    description: "Las 3 facturas pagadas más recientes",
  })
  paidInvoices: Invoice[];

  @Field(() => Int, {
    description:
      "Total adeudado (balance) de todas las facturas impagas en centavos",
  })
  totalUnpaidAmount: number;

  @Field(() => Int, {
    description: "Total pagado de todas las facturas pagadas en centavos",
  })
  totalPaidAmount: number;
}
