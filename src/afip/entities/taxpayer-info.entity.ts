import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType({ description: "Datos del contribuyente obtenidos de ARCA" })
export class TaxpayerInfo {
  @Field({ description: "CUIT sin guiones" })
  cuit: string;

  @Field({ description: "Razón social o nombre completo" })
  razonSocial: string;

  @Field({ description: "Tipo de personería (Física / Jurídica)" })
  personeria: string;

  @Field({ description: "Condición ante IVA" })
  condicionIva: string;

  @Field({ description: "Domicilio fiscal completo (resumen)" })
  domicilioFiscal: string;

  @Field({ description: "Actividad económica principal" })
  actividadPrincipal: string;

  @Field({ nullable: true, description: "Calle y número" })
  street?: string | null;

  @Field({ nullable: true, description: "Ciudad / Localidad" })
  city?: string | null;

  @Field({ nullable: true, description: "Provincia" })
  province?: string | null;

  @Field({ nullable: true, description: "Código postal" })
  zipCode?: string | null;
}
