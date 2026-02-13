import { ObjectType, Field } from "@nestjs/graphql";
import { BillingDocType } from "../enums/billing-doc-type.enum";
import { BillingTaxCondition } from "../enums/billing-tax-condition.enum";

@ObjectType({
  description: "Perfil de facturación (datos fiscales del receptor)",
})
export class BillingProfile {
  @Field({ description: "ID del billing profile" })
  id: string;

  @Field({ description: "ID de la academia" })
  academyId: string;

  @Field({ nullable: true, description: "ID del alumno dueño del perfil" })
  studentId?: string | null;

  @Field({ description: "Nombre a mostrar / Razón social" })
  displayName: string;

  @Field(() => BillingDocType, { description: "Tipo de documento fiscal" })
  docType: BillingDocType;

  @Field({
    nullable: true,
    description: "Número de documento (null si Consumidor Final)",
  })
  docNumber?: string | null;

  @Field(() => BillingTaxCondition, { description: "Condición impositiva" })
  taxCondition: BillingTaxCondition;

  @Field({ nullable: true, description: "Razón social del padrón ARCA" })
  razonSocial?: string | null;

  @Field({ nullable: true, description: "Personería (Física / Jurídica)" })
  personeria?: string | null;

  @Field({ nullable: true, description: "Email de contacto" })
  email?: string | null;

  @Field({ nullable: true, description: "Teléfono de contacto" })
  phone?: string | null;

  @Field({ nullable: true, description: "Domicilio fiscal completo (resumen)" })
  address?: string | null;

  @Field({ nullable: true, description: "Calle y número" })
  street?: string | null;

  @Field({ nullable: true, description: "Departamento / Piso" })
  apartment?: string | null;

  @Field({ nullable: true, description: "Código postal" })
  zipCode?: string | null;

  @Field({ nullable: true, description: "Provincia" })
  province?: string | null;

  @Field({ nullable: true, description: "Ciudad / Localidad" })
  city?: string | null;

  @Field({ description: "Si es el perfil por defecto del alumno" })
  isDefault: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
