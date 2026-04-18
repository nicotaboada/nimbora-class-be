import { ImportEntityType } from "../enums/import-entity-type.enum";
import { ImportValidationError } from "../entities/import-validation-error.entity";

export const IMPORT_VALIDATORS = Symbol("IMPORT_VALIDATORS");

export interface ParsedRow {
  rowNumber: number; // 1-indexed, matches what the user sees in Excel
  cells: Record<string, string | null>; // keyed by ColumnSpec.key
}

/**
 * Tells the parser what columns to expect. `header` is the string the user
 * sees in the file (matched against row 1 of the sheet). `key` is a stable
 * identifier used to index the parsed cells, so validators can look up
 * values without caring about the display label.
 */
export interface ColumnSpec {
  key: string;
  header: string;
  // Value shipped by the template generator for row 2 (the example row).
  // The parser uses it to detect the untouched example by value, which is
  // more robust than the italic-font signal (cell formatting is often lost
  // when the file is re-saved from Google Sheets / Numbers).
  example?: string;
}

export interface ValidationRunResult<TNormalizedRow> {
  totalRows: number;
  normalizedRows: TNormalizedRow[]; // only the valid ones, aligned by index with validRowNumbers
  validRowNumbers: number[];
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

export interface ImportValidator<TNormalizedRow> {
  readonly entityType: ImportEntityType;
  validate(
    parsedRows: ParsedRow[],
    academyId: string,
  ): Promise<ValidationRunResult<TNormalizedRow>>;
  /**
   * Convert a normalized row into a JSON-serializable shape for the
   * Trigger.dev task payload. Entities with non-serializable fields (e.g.
   * Date) override this; the default identity works for plain rows.
   */
  serialize(row: TNormalizedRow): Record<string, unknown>;
}
