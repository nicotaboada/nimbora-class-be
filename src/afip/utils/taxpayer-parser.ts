import { AcademyTaxStatus } from "@prisma/client";
import type {
  AfipActividad,
  AfipDatosGenerales,
  AfipDomicilioFiscal,
  AfipTaxpayerDetails,
} from "../types/afip-sdk.types";
import {
  AFIP_IMPUESTO_IVA_INSCRIPTO,
  AFIP_IMPUESTO_IVA_EXENTO,
  AFIP_PERSONA_FISICA,
} from "../types/afip-sdk.types";

const SIN_DATOS = "N/A";
/** Labels de personería para mostrar */
const PERSONERIA_FISICA = "Física";
const PERSONERIA_JURIDICA = "Jurídica";

const TAX_STATUS_LABELS: Record<AcademyTaxStatus, string> = {
  [AcademyTaxStatus.MONOTRIBUTO]: "Monotributista",
  [AcademyTaxStatus.RESPONSABLE_INSCRIPTO]: "Responsable Inscripto",
  [AcademyTaxStatus.EXENTO]: "IVA Exento",
  [AcademyTaxStatus.CONSUMIDOR_FINAL]: "Consumidor Final",
};

export function mapPersoneria(persona?: AfipDatosGenerales): string {
  return persona?.tipoPersona === AFIP_PERSONA_FISICA
    ? PERSONERIA_FISICA
    : PERSONERIA_JURIDICA;
}

export function extractRazonSocial(persona?: AfipDatosGenerales): string {
  if (!persona) return SIN_DATOS;
  if (persona.tipoPersona === PERSONERIA_FISICA) {
    return `${persona.apellido ?? ""} ${persona.nombre ?? ""}`.trim();
  }
  return persona.razonSocial ?? SIN_DATOS;
}

export function mapCondicionIva(
  taxpayer: AfipTaxpayerDetails,
): AcademyTaxStatus {
  const impuestos = taxpayer.datosRegimenGeneral?.impuesto ?? [];
  const monotributo = taxpayer.datosMonotributo;
  if (monotributo) return AcademyTaxStatus.MONOTRIBUTO;
  const ivaImpuesto = impuestos.find(
    (imp) =>
      imp.idImpuesto === AFIP_IMPUESTO_IVA_INSCRIPTO ||
      imp.idImpuesto === AFIP_IMPUESTO_IVA_EXENTO,
  );
  if (ivaImpuesto) {
    if (ivaImpuesto.idImpuesto === AFIP_IMPUESTO_IVA_INSCRIPTO) {
      return AcademyTaxStatus.RESPONSABLE_INSCRIPTO;
    }
    if (ivaImpuesto.idImpuesto === AFIP_IMPUESTO_IVA_EXENTO) {
      return AcademyTaxStatus.EXENTO;
    }
  }
  return AcademyTaxStatus.CONSUMIDOR_FINAL;
}

export function taxStatusLabel(status: AcademyTaxStatus): string {
  return TAX_STATUS_LABELS[status];
}

export function formatDomicilio(domicilio?: AfipDomicilioFiscal): string {
  if (!domicilio) return SIN_DATOS;
  const parts = [
    domicilio.direccion,
    domicilio.localidad,
    domicilio.descripcionProvincia,
    domicilio.codPostal ? `CP: ${domicilio.codPostal}` : null,
  ].filter(Boolean);
  return parts.join(", ") || SIN_DATOS;
}

export function extractActividadPrincipal(
  taxpayer: AfipTaxpayerDetails,
): string {
  const actividades: AfipActividad[] =
    taxpayer.datosRegimenGeneral?.actividad ??
    taxpayer.datosMonotributo?.actividadMonotributista?.actividad ??
    [];
  if (actividades.length === 0) return SIN_DATOS;
  const principal = actividades.find((a) => a.orden === 1 || a.idActividad);
  return principal?.descripcionActividad ?? SIN_DATOS;
}
