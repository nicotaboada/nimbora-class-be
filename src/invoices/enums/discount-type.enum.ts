import { registerEnumType } from "@nestjs/graphql";
import { DiscountType as PrismaDiscountType } from "@prisma/client";

export const DiscountType = PrismaDiscountType;
export type DiscountType = PrismaDiscountType;

registerEnumType(DiscountType, {
  name: "DiscountType",
  description: "Tipo de descuento",
  valuesMap: {
    PERCENT: { description: "Descuento porcentual (0-100)" },
    FIXED_AMOUNT: { description: "Descuento de monto fijo en centavos" },
  },
});
