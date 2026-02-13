import { registerEnumType } from "@nestjs/graphql";

export enum FeeInvoicingStatus {
  NOT_INVOICED = "NOT_INVOICED",
  PARTIALLY_INVOICED = "PARTIALLY_INVOICED",
  FULLY_INVOICED = "FULLY_INVOICED",
}

registerEnumType(FeeInvoicingStatus, {
  name: "FeeInvoicingStatus",
  description:
    "Estado de facturación de un grupo de cuotas (sin facturar, parcial, completamente facturado)",
});
