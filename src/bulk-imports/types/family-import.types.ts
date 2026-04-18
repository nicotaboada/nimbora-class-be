import { DocumentType } from "../../common/enums";
import { GuardianRelationship } from "../../families/enums/guardian-relationship.enum";

/**
 * Shape of a normalized row for the family import.
 * Only `name` is required; `code` and both guardians are optional.
 * For a guardian block (g1 or g2), if any field is filled then firstName,
 * lastName and relationship become required within that block (all-or-nothing).
 */
export interface FamilyImportGuardian {
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
}

export interface FamilyImportRow {
  code: string | null;
  name: string;
  guardian1: FamilyImportGuardian | null;
  guardian2: FamilyImportGuardian | null;
}

export interface FamilyImportResult {
  status: "imported" | "failed";
  row: number;
  code: string | null;
  familyId?: string;
  error?: string;
}
