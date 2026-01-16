import { registerEnumType } from "@nestjs/graphql";

export enum FeeType {
  ONE_OFF = "ONE_OFF",
  MONTHLY = "MONTHLY",
  PERIODIC = "PERIODIC",
}

registerEnumType(FeeType, {
  name: "FeeType",
  description: "Tipo de fee (único, mensual o periódico)",
});
