import { registerEnumType } from "@nestjs/graphql";
import { BillingTaxCondition } from "@prisma/client";

registerEnumType(BillingTaxCondition, {
  name: "BillingTaxCondition",
  description: "Condición impositiva del receptor",
});

export { BillingTaxCondition } from "@prisma/client";
