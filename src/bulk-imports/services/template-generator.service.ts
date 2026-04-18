import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  formatColumnHeader,
  ImportColumn,
  EntityImportConfig,
} from "../config/entity-import-config";

// Row 1 = headers, row 2 = example (italic, auto-skipped by the parser),
// rows 3..12 = user data. Data validation applies to rows 3..12.
const DATA_ROW_COUNT = 10;
const EXAMPLE_ROW_NUMBER = 2;
const FIRST_DATA_ROW_NUMBER = 3;
// First column used to stash dropdown source values. Placed far to the right
// (AA = 27) so the user doesn't stumble onto it, and marked hidden. Keeping
// the lists inside the same sheet is the only shape that works portably:
// a separate "hidden" sheet shows up as a tab in Numbers, and a
// "veryHidden" sheet breaks data-validation references in Numbers.
const LIST_STORAGE_START_COL = 27;

@Injectable()
export class TemplateGeneratorService {
  /** Returns the XLSX template for the given entity config as a Node Buffer. */
  async generate(config: EntityImportConfig): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Nimbora Class";
    workbook.created = new Date();

    const mainSheet = workbook.addWorksheet(config.sheetName);
    const columns = [...config.columns];

    writeHeaderRow(mainSheet, columns);
    writeExampleRow(mainSheet, columns);
    attachDropdowns(mainSheet, columns);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}

function writeHeaderRow(
  sheet: ExcelJS.Worksheet,
  columns: ImportColumn[],
): void {
  const headers = columns.map((c) => formatColumnHeader(c));
  sheet.addRow(headers);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  for (const [idx, col] of columns.entries()) {
    const sheetCol = sheet.getColumn(idx + 1);
    sheetCol.width = col.widthChars;
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function writeExampleRow(
  sheet: ExcelJS.Worksheet,
  columns: ImportColumn[],
): void {
  const examples = columns.map((c) => c.example);
  sheet.addRow(examples);

  const exampleRow = sheet.getRow(EXAMPLE_ROW_NUMBER);
  // Italic font is the signal the parser uses to skip this row — if the
  // user forgets to delete it, no student gets created from the example.
  exampleRow.font = { italic: true, color: { argb: "FF888888" } };
  exampleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
}

function attachDropdowns(
  mainSheet: ExcelJS.Worksheet,
  columns: ImportColumn[],
): void {
  const sheetName = mainSheet.name;
  let storageColumnIndex = LIST_STORAGE_START_COL;
  const lastDataRow = FIRST_DATA_ROW_NUMBER + DATA_ROW_COUNT - 1;
  let maxListLength = 0;

  for (const [idx, col] of columns.entries()) {
    if (!col.dropdown || col.dropdown.length === 0) continue;

    const storageColLetter = columnLetter(storageColumnIndex);
    storageColumnIndex++;

    // Stash the dropdown values in a far-right column, then hide that column.
    for (const [rowIdx, value] of col.dropdown.entries()) {
      mainSheet.getCell(`${storageColLetter}${rowIdx + 1}`).value = value;
    }
    mainSheet.getColumn(storageColumnIndex - 1).hidden = true;

    const lastListRow = col.dropdown.length;
    if (lastListRow > maxListLength) maxListLength = lastListRow;
    // Reference into the same sheet — most portable across Excel, Numbers
    // and Google Sheets. exceljs prepends "=" itself, so the formula must
    // not start with one.
    const listRef = `'${sheetName}'!$${storageColLetter}$1:$${storageColLetter}$${lastListRow}`;

    const targetColumnLetter = columnLetter(idx + 1);
    for (let row = FIRST_DATA_ROW_NUMBER; row <= lastDataRow; row++) {
      const cell = mainSheet.getCell(`${targetColumnLetter}${row}`);
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [listRef],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Valor inválido",
        error: "Seleccioná un valor de la lista",
      };
    }
  }

  // The dropdown source lists live in hidden columns but still occupy rows,
  // so the sheet naturally extends down to ~250 rows (one per country/phone
  // code). Hide those trailing rows so the user only sees rows 1..12.
  // Data validation references (e.g. $AA$1:$AA$250) keep working on hidden
  // rows.
  for (let row = lastDataRow + 1; row <= maxListLength; row++) {
    mainSheet.getRow(row).hidden = true;
  }
}

function columnLetter(colNumber: number): string {
  let result = "";
  let n = colNumber;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCodePoint(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
