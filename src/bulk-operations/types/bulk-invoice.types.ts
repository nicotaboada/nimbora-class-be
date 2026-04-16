/**
 * Tipos compartidos entre DTOs (validación GraphQL), entities (GraphQL output)
 * y tasks de Trigger.dev. Mantenerlos en un único lugar evita duplicación
 * y desincronización entre los tres puntos.
 */

export type BulkItemStatus = "created" | "skipped" | "failed" | "emitted";

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface BulkInvoiceItem {
  studentId: string;
  chargeIds: string[];
}

export interface BulkFamilyInvoiceItem {
  familyId: string;
  students: BulkInvoiceItem[];
}

// ─── Resultados ────────────────────────────────────────────────────────────

export interface BulkOperationResultBase {
  status: BulkItemStatus;
  error?: string;
}

export interface BulkInvoiceResult extends BulkOperationResultBase {
  studentId: string;
  studentName: string;
  invoiceId?: string;
}

export interface BulkFamilyInvoiceResult extends BulkOperationResultBase {
  familyId: string;
  familyName: string;
  invoiceId?: string;
  studentCount?: number;
  totalLines?: number;
}

export interface BulkAfipInvoiceResult extends BulkOperationResultBase {
  invoiceId: string;
  studentName: string;
  invoiceNumber: number;
  cbteNro?: number;
  cae?: string;
  total?: number;
}
