import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType({
  description: "Desglose por tipo de comprobante AFIP",
})
export class AfipCbteBreakdown {
  @Field(() => Int, {
    description: "Código de tipo de comprobante (1=A, 6=B, 11=C)",
  })
  cbteTipo: number;

  @Field({ description: "Label del tipo de comprobante (Factura A, B, C)" })
  label: string;

  @Field(() => Int, { description: "Cantidad de facturas de este tipo" })
  count: number;

  @Field(() => Int, { description: "Monto total en centavos" })
  amount: number;
}

@ObjectType({
  description: "Resumen de emisión AFIP para las facturas seleccionadas",
})
export class AfipBulkSummary {
  @Field(() => Int, { description: "Cantidad total de facturas" })
  totalCount: number;

  @Field(() => Int, { description: "Monto total en centavos" })
  totalAmount: number;

  @Field(() => [AfipCbteBreakdown], {
    description: "Desglose por tipo de comprobante",
  })
  breakdown: AfipCbteBreakdown[];
}
