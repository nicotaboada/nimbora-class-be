import { ObjectType, Field } from "@nestjs/graphql";
import { BulkInvoiceResult, BulkItemStatus } from "../types/bulk-invoice.types";

@ObjectType({
  description: "Resultado por item de una operación bulk de facturas internas",
})
export class BulkOperationResult implements BulkInvoiceResult {
  @Field({ description: "ID del estudiante procesado" })
  studentId: string;

  @Field({ description: "Nombre del estudiante" })
  studentName: string;

  @Field({ description: "Estado del item: created, skipped, failed" })
  status: BulkItemStatus;

  @Field({ nullable: true, description: "ID de la factura creada" })
  invoiceId?: string;

  @Field({ nullable: true, description: "Detalle del error si falló" })
  error?: string;
}
