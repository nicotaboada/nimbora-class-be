import { registerEnumType } from "@nestjs/graphql";
import { ChargeStatus as PrismaChargeStatus } from "@prisma/client";

export const ChargeStatus = PrismaChargeStatus;
export type ChargeStatus = PrismaChargeStatus;

registerEnumType(ChargeStatus, {
  name: "ChargeStatus",
  description: "Estado del cargo (pendiente, pagado, cancelado)",
});
