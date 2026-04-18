import { Gender, DocumentType } from "../../common/enums";

export interface TeacherImportRow {
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
}

export interface TeacherImportResult {
  status: "imported" | "failed";
  row: number;
  email: string | null;
  teacherId?: string;
  error?: string;
}
