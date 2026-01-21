import { registerEnumType } from "@nestjs/graphql";
import { InvoiceStatus as PrismaInvoiceStatus } from "@prisma/client";

export const InvoiceStatus = PrismaInvoiceStatus;
export type InvoiceStatus = PrismaInvoiceStatus;

registerEnumType(InvoiceStatus, {
  name: "InvoiceStatus",
  description: "Estado de la factura",
  valuesMap: {
    ISSUED: { description: "Factura emitida" },
    PAID: { description: "Factura pagada completamente" },
    PARTIALLY_PAID: { description: "Factura con pago parcial" },
    VOID: { description: "Factura anulada (soft delete)" },
  },
});
