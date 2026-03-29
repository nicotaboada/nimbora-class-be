/**
 * Formats an amount in centavos to ARS currency string.
 * @param centavos - Amount in centavos (e.g., 1500 = $15.00)
 */
export function formatCurrency(centavos: number): string {
  return (centavos / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

/**
 * Formats a Date to a human-readable date string in Spanish.
 * @param date - The date to format
 * @returns e.g., "28 de marzo de 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
