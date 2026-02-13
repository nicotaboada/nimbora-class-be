import { InputType, Field } from "@nestjs/graphql";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from "class-validator";
import { BillingDocType } from "../enums/billing-doc-type.enum";
import { BillingTaxCondition } from "../enums/billing-tax-condition.enum";

@InputType({
  description: "Datos para crear o actualizar un perfil de facturación",
})
export class UpsertBillingProfileInput {
  @Field({
    nullable: true,
    description: "ID del billing profile (si viene, es update)",
  })
  @IsOptional()
  @IsString()
  id?: string;

  @Field({ description: "ID del alumno" })
  @IsNotEmpty({ message: "El studentId es requerido" })
  @IsString()
  studentId: string;

  @Field({ description: "Nombre a mostrar / Razón social" })
  @IsNotEmpty({ message: "El displayName es requerido" })
  @IsString()
  displayName: string;

  @Field(() => BillingDocType, { description: "Tipo de documento fiscal" })
  @IsNotEmpty()
  @IsEnum(BillingDocType, {
    message: "docType debe ser CONSUMIDOR_FINAL, DNI o CUIT",
  })
  docType: BillingDocType;

  @Field({ nullable: true, description: "Número de documento" })
  @IsOptional()
  @IsString()
  docNumber?: string;

  @Field(() => BillingTaxCondition, { description: "Condición impositiva" })
  @IsNotEmpty()
  @IsEnum(BillingTaxCondition, {
    message:
      "taxCondition debe ser CONSUMIDOR_FINAL, MONOTRIBUTO, RESPONSABLE_INSCRIPTO o EXENTO",
  })
  taxCondition: BillingTaxCondition;

  @Field({ nullable: true, description: "Razón social del padrón ARCA" })
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @Field({ nullable: true, description: "Personería (Física / Jurídica)" })
  @IsOptional()
  @IsString()
  personeria?: string;

  @Field({ nullable: true, description: "Email de contacto" })
  @IsOptional()
  @IsEmail({}, { message: "El email debe tener un formato válido" })
  email?: string;

  @Field({ nullable: true, description: "Teléfono de contacto" })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true, description: "Domicilio fiscal completo (resumen)" })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true, description: "Calle y número" })
  @IsOptional()
  @IsString()
  street?: string;

  @Field({ nullable: true, description: "Departamento / Piso" })
  @IsOptional()
  @IsString()
  apartment?: string;

  @Field({ nullable: true, description: "Código postal" })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @Field({ nullable: true, description: "Provincia" })
  @IsOptional()
  @IsString()
  province?: string;

  @Field({ nullable: true, description: "Ciudad / Localidad" })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({
    nullable: true,
    defaultValue: true,
    description: "Si es el perfil por defecto",
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
