/**
 * Tipos de respuesta del SDK de AFIP (@afipsdk/afip.js).
 * El SDK no provee tipos oficiales, así que los definimos acá.
 */

export interface AfipDomicilioFiscal {
  direccion?: string;
  localidad?: string;
  descripcionProvincia?: string;
  codPostal?: string;
}

export interface AfipDatosGenerales {
  tipoPersona?: string;
  razonSocial?: string;
  apellido?: string;
  nombre?: string;
  domicilioFiscal?: AfipDomicilioFiscal;
}

/** IDs de impuesto que devuelve ARCA en datosRegimenGeneral.impuesto */
export const AFIP_IMPUESTO_IVA_INSCRIPTO = 30;
export const AFIP_IMPUESTO_IVA_EXENTO = 32;

/** Valores de tipoPersona que devuelve ARCA */
export const AFIP_PERSONA_FISICA = "FISICA";

/** Valores de respuesta de puntos de venta ARCA */
export const AFIP_BLOQUEADO_SI = "S";

export interface AfipImpuesto {
  idImpuesto: number;
}

export interface AfipActividad {
  orden?: number;
  idActividad?: number;
  descripcionActividad?: string;
}

export interface AfipDatosRegimenGeneral {
  impuesto?: AfipImpuesto[];
  actividad?: AfipActividad[];
}

export interface AfipDatosMonotributo {
  actividadMonotributista?: { actividad?: AfipActividad[] };
}

export interface AfipTaxpayerDetails {
  datosGenerales?: AfipDatosGenerales;
  datosRegimenGeneral?: AfipDatosRegimenGeneral;
  datosMonotributo?: AfipDatosMonotributo;
}

export interface AfipRawSalesPoint {
  Nro: number;
  EmisionTipo: string;
  Bloqueado: string;
  FchBaja?: string | null;
}

export interface AfipSdkError {
  message?: string;
  data?: { message?: string };
}
