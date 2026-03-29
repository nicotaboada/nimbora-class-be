import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType({ description: "Datos fiscales de una factura emitida en AFIP" })
export class AfipInvoice {
  @Field()
  id: string;

  @Field()
  invoiceId: string;

  @Field({ description: "Estado de fiscalización: EMITTING, EMITTED, ERROR" })
  status: string;

  @Field({ nullable: true, description: "CAE otorgado por AFIP" })
  cae?: string;

  @Field({ nullable: true, description: "Fecha de vencimiento del CAE" })
  caeVto?: Date;

  @Field(() => Int, {
    nullable: true,
    description: "Número de comprobante AFIP",
  })
  cbteNro?: number;

  @Field(() => Int, { description: "Tipo de comprobante (1=A, 6=B, 11=C)" })
  cbteTipo: number;

  @Field(() => Int, { description: "Punto de venta" })
  ptoVta: number;

  @Field({ description: "Fecha del comprobante" })
  cbteFch: Date;

  @Field({ description: "Nombre del receptor (snapshot)" })
  recipientName: string;

  @Field({ description: "Tipo de documento: CUIT, DNI, CONSUMIDOR_FINAL" })
  docType: string;

  @Field({ nullable: true, description: "Número de documento" })
  docNumber?: string;

  @Field({ description: "Condición impositiva del receptor" })
  taxCondition: string;
}
