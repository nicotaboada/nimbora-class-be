import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType({
  description: "Resultado por item de una operación bulk de emisión AFIP",
})
export class BulkAfipResult {
  @Field({ description: "ID de la factura interna" })
  invoiceId: string;

  @Field({ description: "Nombre del alumno/receptor" })
  studentName: string;

  @Field(() => Int, { description: "Número de factura interna" })
  invoiceNumber: number;

  @Field({ description: "Estado: emitted, failed, skipped" })
  status: string;

  @Field(() => Int, {
    nullable: true,
    description: "Número de comprobante AFIP",
  })
  cbteNro?: number;

  @Field({ nullable: true, description: "CAE otorgado por AFIP" })
  cae?: string;

  @Field(() => Int, { nullable: true, description: "Monto total en centavos" })
  total?: number;

  @Field({ nullable: true, description: "Detalle del error si falló" })
  error?: string;
}
