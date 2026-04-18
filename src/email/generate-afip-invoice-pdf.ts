import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AfipInvoicePdfLine {
  description: string;
  originalAmount: number; // centavos
  finalAmount: number; // centavos
  discountType?: string | null; // "PERCENT" | "FIXED_AMOUNT"
  discountValue?: number | null;
  isActive: boolean;
}

export interface AfipInvoicePdfData {
  // Emisor (academy)
  emisor: {
    razonSocial: string;
    cuit: string;
    condicionIva: string;
    domicilioFiscal: string;
    taxStatus: string;
  };
  // Comprobante
  cbteTipo: number; // 1=A, 6=B, 11=C
  ptoVta: number;
  cbteNro: number;
  cbteFch: Date;
  // Receptor
  recipientName: string;
  docType: string; // "CUIT" | "DNI" | "CONSUMIDOR_FINAL"
  docNumber?: string | null;
  taxCondition: string; // "CONSUMIDOR_FINAL" | "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO" | "EXENTO"
  recipientAddress?: string | null;
  // Items
  lines: AfipInvoicePdfLine[];
  subtotal: number; // centavos
  totalDiscount: number; // centavos
  total: number; // centavos
  publicNotes?: string | null;
  // AFIP result
  cae: string;
  caeVto: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const CBTE_TIPO_LETTER: Record<number, string> = { 1: "A", 6: "B", 11: "C" };
const CBTE_TIPO_CODE: Record<number, string> = { 1: "01", 6: "06", 11: "11" };
const DOC_TYPE_AFIP_CODE: Record<string, number> = {
  CUIT: 80,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
};

const TAX_CONDITION_LABEL: Record<string, string> = {
  CONSUMIDOR_FINAL: "Consumidor Final",
  MONOTRIBUTO: "Responsable Monotributo",
  RESPONSABLE_INSCRIPTO: "IVA Responsable Inscripto",
  EXENTO: "IVA Exento",
};

const TAX_STATUS_LABEL: Record<string, string> = {
  MONOTRIBUTO: "Monotributista",
  RESPONSABLE_INSCRIPTO: "IVA Responsable Inscripto",
  EXENTO: "IVA Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

const CONDICION_IVA_LABEL: Record<string, string> = {
  MONOTRIBUTO: "Monotributista",
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  EXENTO: "IVA Exento",
  CONSUMIDOR_FINAL: "Consumidor Final",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  CUIT: "CUIT",
  DNI: "DNI",
  CONSUMIDOR_FINAL: "S/identificar",
};

function fmtCbteNro(ptoVta: number, cbteNro: number): string {
  return `${String(ptoVta).padStart(4, "0")}-${String(cbteNro).padStart(8, "0")}`;
}

function cleanCuit(cuit: string): string {
  return cuit.replaceAll(/[-\s]/g, "");
}

function ensureStringArray(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.map((v) => (typeof v === "string" ? v : ""));
  }
  return typeof result === "string" ? [result] : [];
}

// ── Colors ────────────────────────────────────────────────────────────────────

const DARK = [23, 23, 23] as const;
const GRAY = [115, 115, 115] as const;
const LIGHT = [229, 229, 229] as const;
const ROW_DIVIDER = [240, 240, 240] as const;

// ── QR Code Generation ───────────────────────────────────────────────────────

async function generateAfipQrDataUrl(
  data: AfipInvoicePdfData,
): Promise<string> {
  const cuitNumeric = Number(cleanCuit(data.emisor.cuit));
  const docNro = data.docNumber ? Number(data.docNumber) : 0;

  const qrPayload = {
    ver: 1,
    fecha: fmtDateYYYYMMDD(data.cbteFch),
    cuit: cuitNumeric,
    ptoVta: data.ptoVta,
    tipoCmp: data.cbteTipo,
    nroCmp: data.cbteNro,
    importe: data.total / 100,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: DOC_TYPE_AFIP_CODE[data.docType] ?? 99,
    nroDocRec: docNro,
    tipoCodAut: "E",
    codAut: Number(data.cae),
  };

  const base64Payload = Buffer.from(JSON.stringify(qrPayload)).toString(
    "base64",
  );
  const url = `https://www.afip.gob.ar/fe/qr/?p=${base64Payload}`;

  return QRCode.toDataURL(url, { width: 200, margin: 1 });
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

export async function generateAfipInvoicePdf(
  data: AfipInvoicePdfData,
): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ML = 15;
  const MR = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - ML - MR;
  const rightX = pageWidth - MR;
  const centerX = pageWidth / 2;

  const letter = CBTE_TIPO_LETTER[data.cbteTipo] ?? "C";
  const codeStr = CBTE_TIPO_CODE[data.cbteTipo] ?? "11";

  // ── Outer border (wraps entire invoice) ─────────────────────────────────
  const outerTop = 10;

  // ── HEADER: Tripartite layout (dynamic height) ────────────────────────
  const headerTop = outerTop;

  // Center column
  const boxW = 20;
  const boxX = centerX - boxW / 2;

  // Calculate left column height
  const leftColX = ML + 4;
  const leftMaxW = boxX - leftColX - 4;
  let leftY = headerTop + 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const razonLines = ensureStringArray(
    doc.splitTextToSize(data.emisor.razonSocial, leftMaxW),
  );
  leftY += razonLines.length * 5 + 4;
  if (data.emisor.domicilioFiscal) {
    const domLines = ensureStringArray(
      doc.splitTextToSize(data.emisor.domicilioFiscal, leftMaxW),
    );
    leftY += domLines.length * 3.5;
  }

  // Calculate right column height
  const rightH = 7 + 4.5 * 4; // Factura label + 4 key-value rows
  const rightBottom = headerTop + rightH;

  // Header bottom = tallest column + padding, minimum for the letter box
  const boxH = 26;
  const headerBottom = Math.max(leftY, rightBottom, headerTop + boxH + 2) + 3;

  // Draw header border
  doc.setDrawColor(...LIGHT);
  doc.rect(ML, headerTop, contentWidth, headerBottom - headerTop);

  // Center column: fill entire column with gray, then draw lines
  const headerH = headerBottom - headerTop;
  doc.setFillColor(235, 235, 235);
  doc.rect(boxX, headerTop, boxW, headerH, "F");
  doc.setDrawColor(...LIGHT);
  doc.line(boxX, headerTop, boxX, headerBottom);
  doc.line(boxX + boxW, headerTop, boxX + boxW, headerBottom);

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(letter, centerX, headerTop + 13, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Cód.", centerX, headerTop + 19, { align: "center" });
  doc.text(codeStr, centerX, headerTop + 23, { align: "center" });

  // ── Left column: Emisor data ────────────────────────────────────────────
  leftY = headerTop + 7;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(razonLines, leftColX, leftY);
  leftY += razonLines.length * 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    TAX_STATUS_LABEL[data.emisor.taxStatus] ?? data.emisor.taxStatus,
    leftColX,
    leftY,
  );
  leftY += 4;

  if (data.emisor.domicilioFiscal) {
    const domLines = ensureStringArray(
      doc.splitTextToSize(data.emisor.domicilioFiscal, leftMaxW),
    );
    doc.text(domLines, leftColX, leftY);
  }

  // ── Right column: Invoice metadata ────────────────────────────────────
  const rightColX = boxX + boxW + 4;
  const valX = rightColX + 30;
  let rY = headerTop + 7;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(`Factura ${letter}`, rightColX, rY);
  rY += 7;

  doc.setFontSize(8.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Número:", rightColX, rY);
  doc.setFont("helvetica", "normal");
  doc.text(fmtCbteNro(data.ptoVta, data.cbteNro), valX, rY);
  rY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha Emisión:", rightColX, rY);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(data.cbteFch), valX, rY);
  rY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.text("CUIT:", rightColX, rY);
  doc.setFont("helvetica", "normal");
  doc.text(data.emisor.cuit, valX, rY);
  rY += 4.5;

  if (data.emisor.condicionIva) {
    doc.setFont("helvetica", "bold");
    doc.text("Cond. IVA:", rightColX, rY);
    doc.setFont("helvetica", "normal");
    const condLabel =
      CONDICION_IVA_LABEL[data.emisor.condicionIva] ?? data.emisor.condicionIva;
    doc.text(condLabel, valX, rY);
  }

  // ── RECEPTOR BLOCK (no border, just text) ─────────────────────────────
  let y = headerBottom + 6;

  const recLeftX = ML + 4;
  const recValX = recLeftX + 32;
  const recRightKeyX = centerX + 2;
  const recRightValX = recRightKeyX + 22;

  doc.setFontSize(8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Condición de IVA:", recLeftX, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    TAX_CONDITION_LABEL[data.taxCondition] ?? data.taxCondition,
    recValX,
    y,
  );

  if (data.recipientAddress) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Dirección:", recRightKeyX, y);
    doc.setFont("helvetica", "normal");
    const addrLines = ensureStringArray(
      doc.splitTextToSize(data.recipientAddress, rightX - recRightValX - 4),
    );
    doc.text(addrLines, recRightValX, y);
  }

  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Nombre:", recLeftX, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.recipientName, recValX, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Documento:", recLeftX, y);
  doc.setFont("helvetica", "normal");
  const docLabel = DOC_TYPE_LABEL[data.docType] ?? data.docType;
  const docValue = data.docNumber ? `${docLabel}: ${data.docNumber}` : docLabel;
  doc.text(docValue, recValX, y);

  y += 8;

  // Separator line after receptor
  doc.setDrawColor(...LIGHT);
  doc.line(ML, y, rightX, y);
  y += 6;

  // ── LINE ITEMS TABLE ────────────────────────────────────────────────────
  const colDesc = ML + 2;
  const colQty = ML + contentWidth * 0.75;
  const colTotal = rightX - 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Detalle", colDesc, y);
  doc.text("Cantidad", colQty, y, { align: "center" });
  doc.text("Subtotal", colTotal, y, { align: "right" });

  y += 3;
  doc.setDrawColor(...LIGHT);
  doc.line(ML, y, rightX, y);
  y += 5;

  const activeLines = data.lines.filter((l) => l.isActive);

  for (const line of activeLines) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);

    const maxDescW = colQty - colDesc - 15;
    const descLines = ensureStringArray(
      doc.splitTextToSize(line.description || "—", maxDescW),
    );

    doc.text(descLines, colDesc, y);
    doc.text("1", colQty, y, { align: "center" });
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

  // ── TOTALS ──────────────────────────────────────────────────────────────
  const totLX = rightX - 58;

  if (data.subtotal !== data.total) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Subtotal", totLX, y);
    doc.setTextColor(...DARK);
    doc.text(fmtAmount(data.subtotal), rightX, y, { align: "right" });
    y += 5;

    if (data.totalDiscount > 0) {
      doc.setTextColor(...GRAY);
      doc.text("Descuentos", totLX, y);
      doc.setTextColor(...DARK);
      doc.text(`- ${fmtAmount(data.totalDiscount)}`, rightX, y, {
        align: "right",
      });
      y += 5;
    }

    doc.setDrawColor(...LIGHT);
    doc.line(totLX, y, rightX, y);
    y += 5;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Importe TOTAL :", totLX, y);
  doc.text(fmtAmount(data.total), rightX, y, { align: "right" });

  // ── FOOTER: QR + ARCA + CAE (positioned relative to content) ──────────
  const qrDataUrl = await generateAfipQrDataUrl(data);

  y += 10;
  doc.setDrawColor(...LIGHT);
  doc.line(ML, y, rightX, y);

  const footerStartY = y + 4;

  // QR Code (left)
  const qrSize = 30;
  const qrX = ML + 2;
  doc.addImage(qrDataUrl, "PNG", qrX, footerStartY, qrSize, qrSize);

  // ARCA text (right of QR)
  const logoX = qrX + qrSize + 6;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("ARCA", logoX, footerStartY + 8);

  // CAE info (right-aligned)
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(`CAE Nº: ${data.cae}`, rightX, footerStartY + 4, { align: "right" });
  doc.text(
    `Fecha de Vto. de CAE: ${fmtDate(data.caeVto)}`,
    rightX,
    footerStartY + 9,
    {
      align: "right",
    },
  );

  // Comprobante Autorizado
  let authY = footerStartY + 14;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(...DARK);
  doc.text("Comprobante Autorizado", logoX, authY);
  authY += 4;

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GRAY);
  doc.text(
    "Esta Administración Federal no se responsabiliza por los datos ingresados\nen el detalle de la operación",
    logoX,
    authY,
  );

  const outerBottom = footerStartY + qrSize + 6;

  // ── Draw outer border (wraps entire invoice, with padding) ────────────
  const borderPad = 3;
  doc.setDrawColor(...LIGHT);
  doc.rect(
    ML - borderPad,
    outerTop - borderPad,
    contentWidth + borderPad * 2,
    outerBottom - outerTop + borderPad * 2,
  );

  return Buffer.from(doc.output("arraybuffer"));
}
