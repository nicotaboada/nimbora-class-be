import type { AcademyTaxStatus } from "@prisma/client";

/**
 * Tipos públicos del AfipService.
 */

/**
 * Resultado de la consulta de puntos de venta en ARCA
 */
export interface ArcaSalesPointData {
  number: number;
  emissionType: string;
  isBlocked: boolean;
  deactivatedAt: string | null;
}

/**
 * Resultado de la consulta de datos del contribuyente en ARCA
 */
export interface TaxpayerData {
  cuit: string;
  razonSocial: string;
  personeria: string;
  condicionIva: AcademyTaxStatus;
  domicilioFiscal: string;
  actividadPrincipal: string;
  street: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
}
