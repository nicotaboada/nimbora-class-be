import {
  PHONE_CODES,
  formatPhoneCodeDropdownLabel,
} from "../../common/constants/phone-codes";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPE_LABELS,
} from "../../common/constants/document-types";
import {
  GUARDIAN_RELATIONSHIP_OPTIONS,
  GUARDIAN_RELATIONSHIP_LABELS,
} from "../../common/constants/guardian-relationships";
import { DocumentType } from "../../common/enums";
import { GuardianRelationship } from "../../families/enums/guardian-relationship.enum";
import { BulkOperationType } from "../../bulk-operations/enums/bulk-operation-type.enum";
import { ImportEntityType } from "../enums/import-entity-type.enum";
import type { EntityImportConfig, ImportColumn } from "./entity-import-config";

// Column keys index ParsedRow.cells. Flat string keys (g1_ and g2_ prefixes)
// make the XLSX readable; the validator maps them into the nested
// FamilyImportRow shape ({ guardian1, guardian2 }).
export type FamilyColumnKey =
  | "code"
  | "name"
  | "g1_firstName"
  | "g1_lastName"
  | "g1_relationship"
  | "g1_email"
  | "g1_phoneCountryCode"
  | "g1_phoneNumber"
  | "g1_documentType"
  | "g1_documentNumber"
  | "g2_firstName"
  | "g2_lastName"
  | "g2_relationship"
  | "g2_email"
  | "g2_phoneCountryCode"
  | "g2_phoneNumber"
  | "g2_documentType"
  | "g2_documentNumber";

const EXAMPLE_PHONE_OPTION = PHONE_CODES.find((p) => p.countryCode === "AR");
const EXAMPLE_PHONE_LABEL = EXAMPLE_PHONE_OPTION
  ? formatPhoneCodeDropdownLabel(EXAMPLE_PHONE_OPTION)
  : "";

const RELATIONSHIP_DROPDOWN = GUARDIAN_RELATIONSHIP_OPTIONS.map(
  (code) => GUARDIAN_RELATIONSHIP_LABELS[code],
);
const DOCUMENT_TYPE_DROPDOWN = DOCUMENT_TYPE_OPTIONS.map(
  (code) => DOCUMENT_TYPE_LABELS[code],
);
const PHONE_CODE_DROPDOWN = PHONE_CODES.map((p) =>
  formatPhoneCodeDropdownLabel(p),
);

export const FAMILY_IMPORT_COLUMNS: ImportColumn<FamilyColumnKey>[] = [
  {
    key: "code",
    header: "Código",
    required: false,
    widthChars: 20,
    example: "PEREZ-01",
  },
  {
    key: "name",
    header: "Nombre de la familia",
    required: true,
    widthChars: 28,
    example: "Familia Pérez",
  },
  // Guardian 1 (optional; if any field is filled, firstName/lastName/relationship become required)
  {
    key: "g1_firstName",
    header: "Tutor 1 - Nombre",
    required: false,
    widthChars: 20,
    example: "Carlos",
  },
  {
    key: "g1_lastName",
    header: "Tutor 1 - Apellido",
    required: false,
    widthChars: 20,
    example: "Pérez",
  },
  {
    key: "g1_relationship",
    header: "Tutor 1 - Parentesco",
    required: false,
    dropdown: RELATIONSHIP_DROPDOWN,
    widthChars: 18,
    example: GUARDIAN_RELATIONSHIP_LABELS[GuardianRelationship.PADRE],
  },
  {
    key: "g1_email",
    header: "Tutor 1 - Email",
    required: false,
    widthChars: 32,
    example: "carlos.perez@example.com",
  },
  {
    key: "g1_phoneCountryCode",
    header: "Tutor 1 - Código país teléfono",
    required: false,
    dropdown: PHONE_CODE_DROPDOWN,
    widthChars: 28,
    example: EXAMPLE_PHONE_LABEL,
  },
  {
    key: "g1_phoneNumber",
    header: "Tutor 1 - Teléfono",
    required: false,
    widthChars: 18,
    example: "1123456789",
  },
  {
    key: "g1_documentType",
    header: "Tutor 1 - Tipo de documento",
    required: false,
    dropdown: DOCUMENT_TYPE_DROPDOWN,
    widthChars: 20,
    example: DOCUMENT_TYPE_LABELS[DocumentType.DNI],
  },
  {
    key: "g1_documentNumber",
    header: "Tutor 1 - Número de documento",
    required: false,
    widthChars: 22,
    example: "12345678",
  },
  // Guardian 2 (optional)
  {
    key: "g2_firstName",
    header: "Tutor 2 - Nombre",
    required: false,
    widthChars: 20,
    example: "Ana",
  },
  {
    key: "g2_lastName",
    header: "Tutor 2 - Apellido",
    required: false,
    widthChars: 20,
    example: "Gómez",
  },
  {
    key: "g2_relationship",
    header: "Tutor 2 - Parentesco",
    required: false,
    dropdown: RELATIONSHIP_DROPDOWN,
    widthChars: 18,
    example: GUARDIAN_RELATIONSHIP_LABELS[GuardianRelationship.MADRE],
  },
  {
    key: "g2_email",
    header: "Tutor 2 - Email",
    required: false,
    widthChars: 32,
    example: "ana.gomez@example.com",
  },
  {
    key: "g2_phoneCountryCode",
    header: "Tutor 2 - Código país teléfono",
    required: false,
    dropdown: PHONE_CODE_DROPDOWN,
    widthChars: 28,
    example: EXAMPLE_PHONE_LABEL,
  },
  {
    key: "g2_phoneNumber",
    header: "Tutor 2 - Teléfono",
    required: false,
    widthChars: 18,
    example: "1198765432",
  },
  {
    key: "g2_documentType",
    header: "Tutor 2 - Tipo de documento",
    required: false,
    dropdown: DOCUMENT_TYPE_DROPDOWN,
    widthChars: 20,
    example: DOCUMENT_TYPE_LABELS[DocumentType.DNI],
  },
  {
    key: "g2_documentNumber",
    header: "Tutor 2 - Número de documento",
    required: false,
    widthChars: 22,
    example: "87654321",
  },
];

export const FAMILY_IMPORT_SHEET_NAME = "Familias";

export const FAMILY_IMPORT_CONFIG: EntityImportConfig<FamilyColumnKey> = {
  entityType: ImportEntityType.FAMILY,
  sheetName: FAMILY_IMPORT_SHEET_NAME,
  templateFilename: "plantilla-importar-familias.xlsx",
  columns: FAMILY_IMPORT_COLUMNS,
  bulkOperationType: BulkOperationType.BULK_FAMILY_IMPORT,
  triggerTaskId: "bulk-import-families",
};
