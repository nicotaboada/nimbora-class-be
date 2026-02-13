import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class AfipSalesPoint {
  @Field({ description: "ID del punto de venta" })
  id: string;

  @Field({ description: "ID de la configuración AFIP asociada" })
  afipSettingsId: string;

  @Field(() => Int, { description: "Número de punto de venta en ARCA" })
  number: number;

  @Field({ description: "Nombre descriptivo del punto de venta" })
  name: string;

  @Field({ description: "Si el punto de venta está activo en el sistema" })
  isActive: boolean;

  @Field({
    description: "Si el punto de venta fue validado y está habilitado en ARCA",
  })
  isEnabledForArca: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
