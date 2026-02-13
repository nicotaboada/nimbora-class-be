import { InputType, Field } from "@nestjs/graphql";
import { FeeInvoicingStatus } from "../enums/fee-invoicing-status.enum";

@InputType()
export class StudentFeeOverviewFilter {
  @Field(() => FeeInvoicingStatus, {
    nullable: true,
    description:
      "Filtrar por estado de facturación (NOT_INVOICED, PARTIALLY_INVOICED, FULLY_INVOICED)",
  })
  invoicingStatus?: FeeInvoicingStatus;

  @Field({
    nullable: true,
    description:
      "Filtrar cargos que requieren facturación (al menos una cuota con issueDate <= hoy y PENDING)",
  })
  hasChargesRequiringAction?: boolean;
}
