import { registerEnumType } from "@nestjs/graphql";
import { PaymentType as PrismaPaymentType } from "@prisma/client";

export const PaymentType = PrismaPaymentType;
export type PaymentType = PrismaPaymentType;

registerEnumType(PaymentType, {
  name: "PaymentType",
  description: "Tipo de movimiento",
  valuesMap: {
    PAYMENT: { description: "Pago (entrada de dinero)" },
    REFUND: { description: "Devolución (salida de dinero)" },
  },
});
