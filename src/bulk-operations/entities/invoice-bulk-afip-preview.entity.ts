import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType({
  description: "Preview de una factura interna elegible para emisión en AFIP",
})
export class InvoiceBulkAfipPreview {
  @Field({ description: "ID de la factura interna" })
  invoiceId: string;

  @Field(() => Int, { description: "Número de factura interna" })
  invoiceNumber: number;

  @Field({ description: "Nombre del receptor/alumno" })
  studentName: string;

  @Field({ description: "Estado de la factura (siempre PAID)" })
  status: string;

  @Field(() => Int, { description: "Monto total en centavos" })
  total: number;

  @Field({
    nullable: true,
    description: "Nombre del perfil fiscal (si es distinto al alumno)",
  })
  billingDisplayName?: string;

  @Field({
    nullable: true,
    description: "Tipo de documento fiscal (DNI, CUIT, CONSUMIDOR_FINAL)",
  })
  billingDocType?: string;

  @Field({ nullable: true, description: "Número de documento fiscal" })
  billingDocNumber?: string;

  @Field({ nullable: true, description: "Condición impositiva" })
  billingTaxCondition?: string;
}
