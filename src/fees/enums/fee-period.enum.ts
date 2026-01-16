import { registerEnumType } from "@nestjs/graphql";
import { FeePeriod as PrismaFeePeriod } from "@prisma/client";

export const FeePeriod = PrismaFeePeriod;
export type FeePeriod = PrismaFeePeriod;

registerEnumType(FeePeriod, {
  name: "FeePeriod",
  description: "Periodicidad del fee (solo aplica para fees periódicos)",
});
