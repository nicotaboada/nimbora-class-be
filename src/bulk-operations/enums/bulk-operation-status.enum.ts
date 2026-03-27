import { registerEnumType } from "@nestjs/graphql";

export enum BulkOperationStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

registerEnumType(BulkOperationStatus, {
  name: "BulkOperationStatus",
  description: "Estado de una operación bulk",
});
