import { registerEnumType } from "@nestjs/graphql";
import { InvoiceLineType as PrismaInvoiceLineType } from "@prisma/client";

export const InvoiceLineType = PrismaInvoiceLineType;
export type InvoiceLineType = PrismaInvoiceLineType;

registerEnumType(InvoiceLineType, {
  name: "InvoiceLineType",
  description: "Tipo de línea de factura",
  valuesMap: {
    CHARGE: { description: "Línea proveniente de un Charge existente" },
    MANUAL: { description: "Línea manual (materiales, ajuste, clase extra)" },
  },
});
