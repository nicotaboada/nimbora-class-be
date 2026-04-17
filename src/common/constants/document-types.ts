import { DocumentType } from "../enums";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.DNI]: "DNI",
  [DocumentType.PASSPORT]: "Pasaporte",
  [DocumentType.NIE]: "NIE",
  [DocumentType.OTHER]: "Otro",
};

export const DOCUMENT_TYPE_OPTIONS: DocumentType[] = [
  DocumentType.DNI,
  DocumentType.PASSPORT,
  DocumentType.NIE,
  DocumentType.OTHER,
];

const LABEL_TO_CODE = new Map<string, DocumentType>(
  DOCUMENT_TYPE_OPTIONS.map((code) => [DOCUMENT_TYPE_LABELS[code], code]),
);

export function parseDocumentTypeLabel(raw: string): DocumentType | null {
  return LABEL_TO_CODE.get(raw.trim()) ?? null;
}
