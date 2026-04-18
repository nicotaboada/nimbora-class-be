import {
  COUNTRIES,
  formatCountryDropdownLabel,
} from "../../common/constants/countries";
import {
  PHONE_CODES,
  formatPhoneCodeDropdownLabel,
} from "../../common/constants/phone-codes";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPE_LABELS,
} from "../../common/constants/document-types";
import { GENDER_OPTIONS, GENDER_LABELS } from "../../common/constants/genders";
import { DocumentType, Gender } from "../../common/enums";
import { BulkOperationType } from "../../bulk-operations/enums/bulk-operation-type.enum";
import { ImportEntityType } from "../enums/import-entity-type.enum";
import type { StudentImportRow } from "../types/student-import.types";
import type { EntityImportConfig, ImportColumn } from "./entity-import-config";

// Column keys index ParsedRow.cells (the raw XLSX input), not StudentImportRow
// directly. Most match a normalized field, but some (e.g. `classCodes`,
// `familyCode`) hold raw text that the validator resolves into another field
// (`classIds`, `familyId`).
type StudentColumnKey =
  | keyof Omit<StudentImportRow, "classIds" | "familyId">
  | "classCodes"
  | "familyCode";

// Pick Argentina as the example country/phone because it matches the primary
// audience. Fall back to empty string if the list doesn't contain it (e.g.
// countries-list data changes upstream).
const EXAMPLE_COUNTRY_OPTION = COUNTRIES.find((c) => c.code === "AR");
const EXAMPLE_PHONE_OPTION = PHONE_CODES.find((p) => p.countryCode === "AR");
const EXAMPLE_COUNTRY_LABEL = EXAMPLE_COUNTRY_OPTION
  ? formatCountryDropdownLabel(EXAMPLE_COUNTRY_OPTION)
  : "";
const EXAMPLE_PHONE_LABEL = EXAMPLE_PHONE_OPTION
  ? formatPhoneCodeDropdownLabel(EXAMPLE_PHONE_OPTION)
  : "";

/**
 * Column order matches what the user sees in the generated XLSX.
 * Dropdowns pull their options from backend constants so template
 * generation and validation always read from the same source.
 */
export const STUDENT_IMPORT_COLUMNS: ImportColumn<StudentColumnKey>[] = [
  {
    key: "firstName",
    header: "Nombre",
    required: true,
    widthChars: 20,
    example: "Juan",
  },
  {
    key: "lastName",
    header: "Apellido",
    required: true,
    widthChars: 20,
    example: "Pérez",
  },
  {
    key: "email",
    header: "Email",
    required: false,
    widthChars: 32,
    example: "juan.perez@example.com",
  },
  {
    key: "phoneCountryCode",
    header: "Código país teléfono",
    required: false,
    dropdown: PHONE_CODES.map((p) => formatPhoneCodeDropdownLabel(p)),
    widthChars: 28,
    example: EXAMPLE_PHONE_LABEL,
  },
  {
    key: "phoneNumber",
    header: "Teléfono",
    required: false,
    widthChars: 18,
    example: "1123456789",
  },
  {
    key: "birthDate",
    header: "Fecha de nacimiento (DD/MM/AAAA)",
    required: false,
    widthChars: 26,
    example: "15/03/2000",
  },
  {
    key: "gender",
    header: "Género",
    required: false,
    dropdown: GENDER_OPTIONS.map((code) => GENDER_LABELS[code]),
    widthChars: 22,
    example: GENDER_LABELS[Gender.MALE],
  },
  {
    key: "documentType",
    header: "Tipo de documento",
    required: false,
    dropdown: DOCUMENT_TYPE_OPTIONS.map((code) => DOCUMENT_TYPE_LABELS[code]),
    widthChars: 18,
    example: DOCUMENT_TYPE_LABELS[DocumentType.DNI],
  },
  {
    key: "documentNumber",
    header: "Número de documento",
    required: false,
    widthChars: 22,
    example: "12345678",
  },
  {
    key: "address",
    header: "Dirección",
    required: false,
    widthChars: 32,
    example: "Av. Corrientes 1234",
  },
  {
    key: "city",
    header: "Ciudad",
    required: false,
    widthChars: 20,
    example: "Buenos Aires",
  },
  {
    key: "country",
    header: "País",
    required: false,
    dropdown: COUNTRIES.map((c) => formatCountryDropdownLabel(c)),
    widthChars: 28,
    example: EXAMPLE_COUNTRY_LABEL,
  },
  {
    key: "postalCode",
    header: "Código postal",
    required: false,
    widthChars: 14,
    example: "C1043",
  },
  {
    key: "classCodes",
    header: "Códigos de clase (separados por coma)",
    required: false,
    widthChars: 32,
    example: "MAT-1,ING-2",
  },
  {
    key: "familyCode",
    header: "Código de familia",
    required: false,
    widthChars: 20,
    example: "PEREZ-01",
  },
];

export const STUDENT_IMPORT_SHEET_NAME = "Alumnos";

export const STUDENT_IMPORT_CONFIG: EntityImportConfig<StudentColumnKey> = {
  entityType: ImportEntityType.STUDENT,
  sheetName: STUDENT_IMPORT_SHEET_NAME,
  templateFilename: "plantilla-importar-alumnos.xlsx",
  columns: STUDENT_IMPORT_COLUMNS,
  bulkOperationType: BulkOperationType.BULK_STUDENT_IMPORT,
  triggerTaskId: "bulk-import-students",
};
