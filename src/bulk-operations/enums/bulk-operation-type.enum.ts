import { registerEnumType } from "@nestjs/graphql";

export enum BulkOperationType {
  BULK_INVOICE = "BULK_INVOICE",
  BULK_AFIP = "BULK_AFIP",
}

registerEnumType(BulkOperationType, {
  name: "BulkOperationType",
  description: "Tipo de operación bulk",
});
