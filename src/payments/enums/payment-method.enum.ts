import { registerEnumType } from "@nestjs/graphql";
import { PaymentMethod as PrismaPaymentMethod } from "@prisma/client";

export const PaymentMethod = PrismaPaymentMethod;
export type PaymentMethod = PrismaPaymentMethod;

registerEnumType(PaymentMethod, {
  name: "PaymentMethod",
  description: "Método de pago",
  valuesMap: {
    CASH: { description: "Efectivo" },
    BANK_TRANSFER: { description: "Transferencia bancaria" },
    CARD: { description: "Tarjeta" },
  },
});
