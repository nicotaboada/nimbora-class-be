import { registerEnumType } from "@nestjs/graphql";
import { CreditStatus as PrismaCreditStatus } from "@prisma/client";

export const CreditStatus = PrismaCreditStatus;
export type CreditStatus = PrismaCreditStatus;

registerEnumType(CreditStatus, {
  name: "CreditStatus",
  description: "Estado del crédito",
  valuesMap: {
    AVAILABLE: { description: "Crédito disponible para usar" },
    USED: { description: "Crédito consumido (total o parcialmente)" },
    VOID: { description: "Anulado" },
  },
});
