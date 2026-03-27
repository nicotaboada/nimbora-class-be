import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class BulkOperationResult {
  @Field({ description: "ID del estudiante procesado" })
  studentId: string;

  @Field({ description: "Nombre del estudiante" })
  studentName: string;

  @Field({ description: "Estado del item: created, skipped, failed" })
  status: string;

  @Field({ nullable: true, description: "ID de la factura creada" })
  invoiceId?: string;

  @Field({ nullable: true, description: "Detalle del error si falló" })
  error?: string;
}
