import { AcademyTaxStatus, BillingTaxCondition } from "@prisma/client";

/**
 * AFIP comprobante type codes
 */
export const CBTE_TIPO = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
} as const;

/**
 * Labels for comprobante types
 */
export const CBTE_TIPO_LABELS: Record<number, string> = {
  [CBTE_TIPO.FACTURA_A]: "Factura A",
  [CBTE_TIPO.FACTURA_B]: "Factura B",
  [CBTE_TIPO.FACTURA_C]: "Factura C",
};

/**
 * Resolves the AFIP comprobante type (cbteTipo) based on the academy's
 * tax status and the recipient's tax condition.
 *
 * Rules:
 * - Academy RI + Recipient RI/Monotributo → Factura A (1)
 * - Academy RI + Recipient Cons.Final/Exento → Factura B (6)
 * - Academy Monotributo/Exento/Cons.Final → Factura C (11) always
 */
export function resolveCbteTipo(
  academyTaxStatus: AcademyTaxStatus,
  recipientTaxCondition: BillingTaxCondition,
): number {
  if (academyTaxStatus === AcademyTaxStatus.RESPONSABLE_INSCRIPTO) {
    if (
      recipientTaxCondition === BillingTaxCondition.RESPONSABLE_INSCRIPTO ||
      recipientTaxCondition === BillingTaxCondition.MONOTRIBUTO
    ) {
      return CBTE_TIPO.FACTURA_A;
    }
    return CBTE_TIPO.FACTURA_B;
  }

  // Monotributo, Exento, or Consumidor Final → always Factura C
  return CBTE_TIPO.FACTURA_C;
}

/**
 * Maps BillingDocType to AFIP DocTipo numeric code.
 */
export function resolveDocTipo(docType: string): number {
  switch (docType) {
    case "CUIT": {
      return 80;
    }
    case "DNI": {
      return 96;
    }
    default: {
      return 99;
    }
  }
}

/**
 * Maps BillingTaxCondition to AFIP CondicionIvaReceptor numeric code.
 * Required by RG 5616.
 */
export function resolveCondicionIvaReceptor(taxCondition: string): number {
  switch (taxCondition) {
    case "RESPONSABLE_INSCRIPTO": {
      return 1;
    }
    case "EXENTO": {
      return 4;
    }
    case "CONSUMIDOR_FINAL": {
      return 5;
    }
    case "MONOTRIBUTO": {
      return 6;
    }
    default: {
      return 5;
    } // Default to Consumidor Final
  }
}
