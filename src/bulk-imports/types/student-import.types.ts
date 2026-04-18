import { Gender, DocumentType } from "../../common/enums";

/**
 * Shape of a parsed + normalized row from the student import XLSX.
 * `raw*` fields hold what came in the file; normalized fields are the
 * DB-ready values. Validators fail early if normalization can't resolve
 * a dropdown label to its enum/code.
 */
export interface StudentImportRow {
  firstName: string;
  lastName: string;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  classIds: string[];
  familyId: string | null;
}

export interface StudentImportResult {
  status: "imported" | "failed";
  row: number;
  email: string | null;
  studentId?: string;
  error?: string;
}
