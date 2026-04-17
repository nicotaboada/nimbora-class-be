import { Injectable, BadRequestException } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  ColumnSpec,
  ParsedRow,
} from "../validators/import-validator.interface";

@Injectable()
export class XlsxParserService {
  /**
   * Parses an XLSX file (base64-encoded) expecting the given sheet with the
   * given columns in the first row. Returns rows starting at row 2.
   *
   * Columns are matched against the sheet by their `header` (display label);
   * parsed cells are indexed by `key` so validators can use stable
   * identifiers.
   *
   * Missing columns throw BadRequestException. Empty rows (all cells null)
   * are skipped.
   */
  async parse(
    fileBase64: string,
    sheetName: string,
    columns: ColumnSpec[],
  ): Promise<ParsedRow[]> {
    const buffer = this.decodeBase64(fileBase64);

    const workbook = new ExcelJS.Workbook();
    try {
      // exceljs declares `Buffer extends ArrayBuffer` locally, so it wants an
      // ArrayBuffer-like value at runtime (xlsx.load accepts Uint8Array too).
      // Copy Node's Buffer into a fresh ArrayBuffer to satisfy both sides.
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(arrayBuffer).set(buffer);
      await workbook.xlsx.load(arrayBuffer);
    } catch {
      throw new BadRequestException(
        "El archivo no es un XLSX válido o está corrupto",
      );
    }

    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      throw new BadRequestException(
        `El archivo no contiene la hoja "${sheetName}"`,
      );
    }

    const headerRow = sheet.getRow(1);
    const headerToColumn = new Map<string, number>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const value = cellToString(cell);
      if (value) headerToColumn.set(value, colNumber);
    });

    const missing = columns
      .filter((c) => !headerToColumn.has(c.header))
      .map((c) => c.header);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan columnas en el archivo: ${missing.join(", ")}`,
      );
    }

    const parsedRows: ParsedRow[] = [];
    const lastRow = sheet.actualRowCount;
    for (let rowNum = 2; rowNum <= lastRow; rowNum++) {
      const row = sheet.getRow(rowNum);
      const cells: Record<string, string | null> = {};
      let hasAny = false;
      for (const col of columns) {
        const colNumber = headerToColumn.get(col.header);
        if (colNumber === undefined) continue;
        const value = cellToString(row.getCell(colNumber));
        cells[col.key] = value;
        if (value !== null) hasAny = true;
      }
      if (!hasAny) continue;
      // Skip the example row that ships with the template. Two independent
      // signals, either is enough:
      //   1. Every populated cell is italic (template-generator formatting).
      //   2. Every populated cell matches the expected example value.
      // The value match is what catches files roundtripped through Google
      // Sheets / Numbers, which silently drop cell-level italic formatting.
      if (isExampleRow(row, columns, headerToColumn, cells)) continue;
      parsedRows.push({ rowNumber: rowNum, cells });
    }

    return parsedRows;
  }

  private decodeBase64(fileBase64: string): Buffer {
    const stripped = fileBase64.replace(/^data:[^;]+;base64,/, "");
    try {
      return Buffer.from(stripped, "base64");
    } catch {
      throw new BadRequestException("El archivo en base64 es inválido");
    }
  }
}

/**
 * Extracts a trimmed string from an ExcelJS cell, or null if empty.
 *
 * Numbers/Excel store text cells in many shapes — plain string, hyperlink
 * (Numbers auto-links emails to `mailto:` — this is the subtle one),
 * rich-text, formula result. `cell.text` is supposed to flatten all of
 * these but fails in some Numbers-generated hyperlink shapes, so we
 * discriminate on `cell.value` first and only fall back to `cell.text`.
 *
 * Dates stay on `cell.value` because `cell.text` formats them per the
 * workbook locale, which breaks the DD/MM/YYYY contract with our validator.
 */
function cellToString(cell: ExcelJS.Cell): string | null {
  const value = cell.value;

  if (value === null || value === undefined) {
    return fallbackToCellText(cell);
  }

  if (value instanceof Date) {
    const day = String(value.getUTCDate()).padStart(2, "0");
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const year = value.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  if (typeof value === "string") return trimToNull(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    // Formula → use cached result (exceljs stores formula output here)
    if (
      "result" in value &&
      value.result !== undefined &&
      value.result !== null
    ) {
      const inner = value.result;
      if (inner instanceof Date) return cellToString(cell);
      if (typeof inner === "string") return trimToNull(inner);
      if (typeof inner === "number" || typeof inner === "boolean") {
        return String(inner);
      }
    }

    // Hyperlink → { text, hyperlink }. `text` may be string or rich text.
    if ("hyperlink" in value && "text" in value) {
      return extractTextOrRichText(value.text);
    }

    // Rich text → { richText: [{ text, font? }, ...] }
    if ("richText" in value && Array.isArray(value.richText)) {
      const joined = value.richText
        .map((r: { text?: string }) => r.text ?? "")
        .join("");
      return trimToNull(joined);
    }
  }

  return fallbackToCellText(cell);
}

function fallbackToCellText(cell: ExcelJS.Cell): string | null {
  const text = cell.text;
  return typeof text === "string" ? trimToNull(text) : null;
}

function trimToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * A row is considered the template's example row when EITHER:
 *   a) every populated cell is italic (template-generator formatting), OR
 *   b) every populated cell's value matches the column's `example` value.
 *
 * (b) is what catches files roundtripped through Google Sheets / Numbers,
 * which often strip cell-level italic formatting on save — so (a) alone
 * used to let the example row leak into the import.
 *
 * Partial edits still parse: once the user edits a cell, the italic goes
 * away AND the value no longer matches the example, so neither signal
 * fires on that cell.
 */
function isExampleRow(
  row: ExcelJS.Row,
  columns: ColumnSpec[],
  headerToColumn: Map<string, number>,
  parsedCells: Record<string, string | null>,
): boolean {
  let sawAnyValue = false;
  let allItalic = true;
  let allMatchExample = true;
  let hasAnyExample = false;

  for (const col of columns) {
    const colNumber = headerToColumn.get(col.header);
    if (colNumber === undefined) continue;
    const cell = row.getCell(colNumber);
    if (cell.value === null || cell.value === undefined) continue;
    sawAnyValue = true;

    if (cell.font?.italic !== true) allItalic = false;

    if (col.example !== undefined && col.example !== "") {
      hasAnyExample = true;
      if (parsedCells[col.key] !== col.example) allMatchExample = false;
    } else {
      // Column has no configured example, so we can't use value-match for it.
      // If this cell has a value but no example to compare against, value-match
      // alone can't confirm the example row.
      allMatchExample = false;
    }
  }

  if (!sawAnyValue) return false;
  return allItalic || (hasAnyExample && allMatchExample);
}

function extractTextOrRichText(value: unknown): string | null {
  if (typeof value === "string") return trimToNull(value);
  if (typeof value === "object" && value !== null && "richText" in value) {
    const rt = (value as { richText: { text?: string }[] }).richText;
    if (Array.isArray(rt)) {
      const joined = rt.map((r) => r.text ?? "").join("");
      return trimToNull(joined);
    }
  }
  return null;
}
