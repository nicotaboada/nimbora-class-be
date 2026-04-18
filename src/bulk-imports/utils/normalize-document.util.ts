import { parseDocumentTypeLabel } from "../../common/constants/document-types";
import { DocumentType } from "../../common/enums";
import { AddErrorFn } from "./validation-patterns";

export function normalizeDocumentType(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): DocumentType | null {
  if (!raw) return null;
  const parsed = parseDocumentTypeLabel(raw);
  if (parsed) return parsed;
  addError(column, "Valor inválido");
  return null;
}

export function normalizeDocumentNumber(
  raw: string | null,
  documentType: DocumentType | null,
  column: string,
  addError: AddErrorFn,
): string | null {
  if (!raw) return null;
  if (documentType === DocumentType.DNI && !/^\d{7,8}$/.test(raw)) {
    addError(column, "DNI debe tener 7 u 8 dígitos");
    return null;
  }
  if (documentType === DocumentType.OTHER && raw.length > 40) {
    addError(column, "Máximo 40 caracteres");
    return null;
  }
  return raw;
}
