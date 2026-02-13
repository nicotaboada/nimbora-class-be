import { registerEnumType } from "@nestjs/graphql";

export enum ChargeInvoicingState {
  PENDING = "PENDING",
  REQUIRES_INVOICING = "REQUIRES_INVOICING",
  INVOICED = "INVOICED",
}

registerEnumType(ChargeInvoicingState, {
  name: "ChargeInvoicingState",
  description:
    "Estado visual de facturación de una cuota (pendiente, a facturar, facturado)",
});
