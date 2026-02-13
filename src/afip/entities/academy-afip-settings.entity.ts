import { ObjectType, Field, Int } from "@nestjs/graphql";
import { registerEnumType } from "@nestjs/graphql";

export enum AcademyTaxStatus {
  MONOTRIBUTO = "MONOTRIBUTO",
  RESPONSABLE_INSCRIPTO = "RESPONSABLE_INSCRIPTO",
  EXENTO = "EXENTO",
  CONSUMIDOR_FINAL = "CONSUMIDOR_FINAL",
}

export enum AfipEnvironment {
  HOMO = "HOMO",
  PROD = "PROD",
}

export enum AfipDelegationStatus {
  PENDING = "PENDING",
  OK = "OK",
  ERROR = "ERROR",
}

export enum AfipOnboardingStep {
  FISCAL_DATA = "FISCAL_DATA",
  DELEGATION_1 = "DELEGATION_1",
  DELEGATION_2 = "DELEGATION_2",
  COMPLETED = "COMPLETED",
}

registerEnumType(AcademyTaxStatus, { name: "AcademyTaxStatus" });
registerEnumType(AfipEnvironment, { name: "AfipEnvironment" });
registerEnumType(AfipDelegationStatus, { name: "AfipDelegationStatus" });
registerEnumType(AfipOnboardingStep, { name: "AfipOnboardingStep" });

@ObjectType()
export class AcademyAfipSettings {
  @Field()
  id: string;

  @Field()
  academyId: string;

  @Field(() => AcademyTaxStatus)
  taxStatus: AcademyTaxStatus;

  @Field({ description: "CUIT de la academy" })
  cuit: string;

  @Field({ nullable: true, description: "Razón social o nombre completo" })
  razonSocial?: string;

  @Field({
    nullable: true,
    description: "Tipo de personería (Física / Jurídica)",
  })
  personeria?: string;

  @Field({ nullable: true, description: "Condición ante IVA" })
  condicionIva?: string;

  @Field({ nullable: true, description: "Domicilio fiscal completo" })
  domicilioFiscal?: string;

  @Field({ nullable: true, description: "Actividad económica principal" })
  actividadPrincipal?: string;

  @Field(() => Int, { description: "Punto de venta por defecto" })
  defaultPtoVta: number;

  @Field(() => AfipEnvironment, {
    description: "Ambiente AFIP (HOMO o PROD)",
  })
  environment: AfipEnvironment;

  @Field(() => Int, {
    nullable: true,
    description: "Tasa de IVA en permil (21000 = 21%). Solo para RI.",
  })
  vatRatePermil?: number;

  @Field(() => AfipDelegationStatus, {
    description: "Estado de la delegación WSFE",
  })
  delegationStatus: AfipDelegationStatus;

  @Field({
    nullable: true,
    description: "Fecha en que se verificó la delegación OK",
  })
  delegatedAt?: Date;

  @Field(() => AfipOnboardingStep, {
    description: "Paso actual del onboarding AFIP",
  })
  onboardingStep: AfipOnboardingStep;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
