import { BulkOperationType } from "../../bulk-operations/enums/bulk-operation-type.enum";
import { ImportEntityType } from "../enums/import-entity-type.enum";

/**
 * Column spec for an entity import. `key` is a stable identifier used by the
 * validator to look up cells; `header` is the display label the user sees
 * in the generated XLSX (and is also matched against row 1 when parsing).
 */
export interface ImportColumn<TKey extends string = string> {
  key: TKey;
  header: string;
  required: boolean;
  dropdown?: string[];
  widthChars: number;
  example: string;
}

/**
 * Per-entity configuration that drives template generation, parsing, and
 * the dispatch of the Trigger.dev task. Adding a new importable entity means
 * writing a validator and adding one entry to ENTITY_IMPORT_REGISTRY.
 */
export interface EntityImportConfig<TKey extends string = string> {
  entityType: ImportEntityType;
  sheetName: string;
  templateFilename: string;
  columns: readonly ImportColumn<TKey>[];
  bulkOperationType: BulkOperationType;
  triggerTaskId: string;
}

export function formatColumnHeader(col: ImportColumn): string {
  return `${col.header} (${col.required ? "Requerido" : "Opcional"})`;
}
