import { registerEnumType } from "@nestjs/graphql";
import { PaymentStatus as PrismaPaymentStatus } from "@prisma/client";

export const PaymentStatus = PrismaPaymentStatus;
export type PaymentStatus = PrismaPaymentStatus;

registerEnumType(PaymentStatus, {
  name: "PaymentStatus",
  description: "Estado del pago",
  valuesMap: {
    PENDING_REVIEW: {
      description: "Comprobante subido, esperando aprobación",
    },
    APPROVED: { description: "Pago confirmado" },
    REJECTED: { description: "Rechazado" },
    VOID: { description: "Anulado" },
  },
});
