import { registerEnumType } from "@nestjs/graphql";
import { BillingDocType } from "@prisma/client";

registerEnumType(BillingDocType, {
  name: "BillingDocType",
  description: "Tipo de documento fiscal del receptor",
});

export { BillingDocType } from "@prisma/client";
