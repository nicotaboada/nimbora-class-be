import { registerEnumType } from "@nestjs/graphql";

export enum BulkOperationType {
  BULK_INVOICE = "BULK_INVOICE",
  BULK_AFIP = "BULK_AFIP",
  BULK_FAMILY_INVOICE = "BULK_FAMILY_INVOICE",
  BULK_STUDENT_IMPORT = "BULK_STUDENT_IMPORT",
  BULK_TEACHER_IMPORT = "BULK_TEACHER_IMPORT",
  BULK_FAMILY_IMPORT = "BULK_FAMILY_IMPORT",
}

registerEnumType(BulkOperationType, {
  name: "BulkOperationType",
  description: "Tipo de operación bulk",
});
