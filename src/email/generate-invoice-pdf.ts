import { jsPDF } from "jspdf";

export interface InvoicePdfLine {
  description: string;
  originalAmount: number; // centavos
  finalAmount: number; // centavos
  discountType?: string | null; // "PERCENT" | "FIXED_AMOUNT"
  discountValue?: number | null;
  isActive: boolean;
}

export interface InvoicePdfData {
  invoiceNumber: number;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  issueDate: Date;
  dueDate: Date;
  subtotal: number; // centavos
  totalDiscount: number; // centavos
  total: number; // centavos
  publicNotes?: string | null;
  lines: InvoicePdfLine[];
}

function fmtAmount(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ensureStringArray(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.map((v) => (typeof v === "string" ? v : ""));
  }
  return typeof result === "string" ? [result] : [];
}

const DARK = [23, 23, 23] as const;
const GRAY = [115, 115, 115] as const;
const LIGHT = [229, 229, 229] as const;
const ROW_DIVIDER = [240, 240, 240] as const;

/**
 * Generates an invoice PDF server-side and returns a Buffer.
 * Same layout as the frontend generate-invoice-pdf.ts.
 */
export function generateInvoicePdf(invoice: InvoicePdfData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ML = 15;
  const MR = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - ML - MR;
  const rightX = pageWidth - MR;

  // ── TWO-COLUMN HEADER ─────────────────────────────────────────────────
  let leftY = 20;
  let rightY = 20;

  // RIGHT: Invoice number (large)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(
    `Nº ${String(invoice.invoiceNumber).padStart(5, "0")}`,
    rightX,
    rightY,
    { align: "right" },
  );
  rightY += 7;

  // RIGHT: Dates
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Fecha de emisión: ${fmtDate(invoice.issueDate)}`, rightX, rightY, {
    align: "right",
  });
  rightY += 5;
  doc.text(
    `Fecha de vencimiento: ${fmtDate(invoice.dueDate)}`,
    rightX,
    rightY,
    { align: "right" },
  );
  rightY += 5;

  // LEFT: "FACTURAR A" label
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("FACTURAR A", ML, leftY);
  leftY += 5;

  // LEFT: Recipient name
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(invoice.recipientName, ML, leftY);
  leftY += 6;

  // LEFT: Contact details
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);

  const halfWidth = pageWidth / 2 - ML - 10;

  if (invoice.recipientEmail) {
    doc.text(invoice.recipientEmail, ML, leftY);
    leftY += 4.5;
  }
  if (invoice.recipientAddress) {
    const wrapped = ensureStringArray(
      doc.splitTextToSize(invoice.recipientAddress, halfWidth),
    );
    doc.text(wrapped, ML, leftY);
    leftY += wrapped.length * 4.5;
  }
  if (invoice.recipientPhone) {
    doc.text(invoice.recipientPhone, ML, leftY);
    leftY += 4.5;
  }

  // Advance y past both columns
  let y = Math.max(leftY, rightY) + 12;

  // ── TABLE ─────────────────────────────────────────────────────────────
  const colCod = ML;
  const colDesc = ML + 20;
  const colQty = ML + contentWidth * 0.66;
  const colPrice = ML + contentWidth * 0.81;
  const colTotal = rightX;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Código", colCod, y);
  doc.text("Descripción", colDesc, y);
  doc.text("Cant.", colQty, y, { align: "center" });
  doc.text("Precio Unit.", colPrice, y, { align: "right" });
  doc.text("Subtotal", colTotal, y, { align: "right" });

  y += 4;
  doc.setDrawColor(...LIGHT);
  doc.line(ML, y, rightX, y);
  y += 6;

  // Rows
  const activeLines = invoice.lines.filter((l) => l.isActive);

  for (const [index, line] of activeLines.entries()) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);

    const code = String(index + 1).padStart(3, "0");
    const maxDescW = colQty - colDesc - 4;
    const descLines = ensureStringArray(
      doc.splitTextToSize(line.description || "—", maxDescW),
    );

    doc.text(code, colCod, y);
    doc.text(descLines, colDesc, y);
    doc.text("1", colQty, y, { align: "center" });
    doc.text(fmtAmount(line.originalAmount), colPrice, y, { align: "right" });
    doc.text(fmtAmount(line.finalAmount), colTotal, y, { align: "right" });

    let rowH = descLines.length * 4.5;

    if (line.discountValue && line.discountValue > 0) {
      const discLabel =
        line.discountType === "PERCENT"
          ? `Desc. ${line.discountValue}%`
          : `Desc. -${fmtAmount(line.discountValue)}`;
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(discLabel, colDesc, y + rowH);
      rowH += 4;
    }

    y += rowH + 3;
    doc.setDrawColor(...ROW_DIVIDER);
    doc.line(ML, y, rightX, y);
    y += 4.5;
  }

  y += 4;

  // ── TOTALS ────────────────────────────────────────────────────────────
  const totLX = rightX - 58;

  if (invoice.subtotal !== invoice.total) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Subtotal", totLX, y);
    doc.setTextColor(...DARK);
    doc.text(fmtAmount(invoice.subtotal), rightX, y, { align: "right" });
    y += 5;

    if (invoice.totalDiscount > 0) {
      doc.setTextColor(...GRAY);
      doc.text("Descuentos", totLX, y);
      doc.setTextColor(...DARK);
      doc.text(`- ${fmtAmount(invoice.totalDiscount)}`, rightX, y, {
        align: "right",
      });
      y += 5;
    }

    doc.setDrawColor(...LIGHT);
    doc.line(totLX, y, rightX, y);
    y += 5;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Total", totLX, y);
  doc.text(fmtAmount(invoice.total), rightX, y, { align: "right" });

  // ── PUBLIC NOTES ──────────────────────────────────────────────────────
  if (invoice.publicNotes) {
    y += 14;
    doc.setDrawColor(...LIGHT);
    doc.line(ML, y, rightX, y);
    y += 7;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY);
    doc.text("NOTAS", ML, y);
    y += 4.5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    const noteLines = ensureStringArray(
      doc.splitTextToSize(invoice.publicNotes, contentWidth),
    );
    doc.text(noteLines, ML, y);
  }

  // ── FOOTER ────────────────────────────────────────────────────────────
  const footerLineY = pageHeight - 18;
  const footerTextY = pageHeight - 10;

  doc.setDrawColor(...LIGHT);
  doc.line(ML, footerLineY, rightX, footerLineY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const prefixText = "Generado por  ";
  const prefixW = doc.getTextWidth(prefixText);

  doc.setFont("helvetica", "bold");
  const brandText = "Nimbora Class";
  const brandW = doc.getTextWidth(brandText);

  const startX = (pageWidth - prefixW - brandW) / 2;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(prefixText, startX, footerTextY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(brandText, startX + prefixW, footerTextY);

  // Return as Buffer instead of saving to file
  return Buffer.from(doc.output("arraybuffer"));
}
