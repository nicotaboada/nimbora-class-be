import { DiscountType } from "../enums/discount-type.enum";

interface LineForCalculation {
  originalAmount: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  isActive: boolean;
}

interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  total: number;
}

interface DiscountValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida los parámetros de descuento.
 * T15/T16: Percent debe estar entre 0 y 100
 * T17/T18: Fixed no puede ser negativo ni superar originalAmount
 */
export function validateDiscount(
  originalAmount: number,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): DiscountValidationResult {
  if (!discountType || discountValue === null || discountValue === undefined) {
    return { isValid: true };
  }
  if (discountValue < 0) {
    return { isValid: false, error: "Discount value cannot be negative" };
  }
  if (discountType === DiscountType.PERCENT) {
    if (discountValue > 100) {
      return {
        isValid: false,
        error: "Percent discount must be between 0 and 100",
      };
    }
  } else if (
    discountType === DiscountType.FIXED_AMOUNT &&
    discountValue > originalAmount
  ) {
    return { isValid: false, error: "Discount exceeds amount" };
  }
  return { isValid: true };
}

/**
 * Calcula el monto final de una línea aplicando el descuento.
 */
export function calculateFinalAmount(
  originalAmount: number,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): number {
  if (!discountType || discountValue === null || discountValue === undefined) {
    return originalAmount;
  }
  let discountAmount = 0;
  if (discountType === DiscountType.PERCENT) {
    discountAmount = Math.round((originalAmount * discountValue) / 100);
  } else if (discountType === DiscountType.FIXED_AMOUNT) {
    discountAmount = discountValue;
  }
  const finalAmount = originalAmount - discountAmount;
  return Math.max(0, finalAmount);
}

/**
 * Calcula el monto del descuento de una línea.
 */
export function calculateDiscountAmount(
  originalAmount: number,
  discountType?: DiscountType | null,
  discountValue?: number | null,
): number {
  if (!discountType || discountValue === null || discountValue === undefined) {
    return 0;
  }
  if (discountType === DiscountType.PERCENT) {
    return Math.round((originalAmount * discountValue) / 100);
  }
  return Math.min(discountValue, originalAmount);
}

/**
 * Calcula los totales de una factura basándose en sus líneas activas.
 */
export function calculateInvoiceTotals(
  lines: LineForCalculation[],
): InvoiceTotals {
  const activeLines = lines.filter((line) => line.isActive);
  const subtotal = activeLines.reduce(
    (sum, line) => sum + line.originalAmount,
    0,
  );
  const totalDiscount = activeLines.reduce(
    (sum, line) =>
      sum +
      calculateDiscountAmount(
        line.originalAmount,
        line.discountType,
        line.discountValue,
      ),
    0,
  );
  const total = activeLines.reduce(
    (sum, line) =>
      sum +
      calculateFinalAmount(
        line.originalAmount,
        line.discountType,
        line.discountValue,
      ),
    0,
  );
  return { subtotal, totalDiscount, total };
}
