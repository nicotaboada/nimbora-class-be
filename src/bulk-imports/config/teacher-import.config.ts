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
import type { TeacherImportRow } from "../types/teacher-import.types";
import type { EntityImportConfig, ImportColumn } from "./entity-import-config";

type TeacherColumnKey = keyof TeacherImportRow;

const EXAMPLE_COUNTRY_OPTION = COUNTRIES.find((c) => c.code === "AR");
const EXAMPLE_PHONE_OPTION = PHONE_CODES.find((p) => p.countryCode === "AR");
const EXAMPLE_COUNTRY_LABEL = EXAMPLE_COUNTRY_OPTION
  ? formatCountryDropdownLabel(EXAMPLE_COUNTRY_OPTION)
  : "";
const EXAMPLE_PHONE_LABEL = EXAMPLE_PHONE_OPTION
  ? formatPhoneCodeDropdownLabel(EXAMPLE_PHONE_OPTION)
  : "";

export const TEACHER_IMPORT_COLUMNS: ImportColumn<TeacherColumnKey>[] = [
  {
    key: "firstName",
    header: "Nombre",
    required: true,
    widthChars: 20,
    example: "María",
  },
  {
    key: "lastName",
    header: "Apellido",
    required: true,
    widthChars: 20,
    example: "González",
  },
  {
    key: "email",
    header: "Email",
    required: false,
    widthChars: 32,
    example: "maria.gonzalez@example.com",
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
    example: "20/06/1985",
  },
  {
    key: "gender",
    header: "Género",
    required: false,
    dropdown: GENDER_OPTIONS.map((code) => GENDER_LABELS[code]),
    widthChars: 22,
    example: GENDER_LABELS[Gender.FEMALE],
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
    example: "30123456",
  },
  {
    key: "address",
    header: "Dirección",
    required: false,
    widthChars: 32,
    example: "Av. Santa Fe 2200",
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
    example: "C1123",
  },
];

export const TEACHER_IMPORT_SHEET_NAME = "Profesores";

export const TEACHER_IMPORT_CONFIG: EntityImportConfig<TeacherColumnKey> = {
  entityType: ImportEntityType.TEACHER,
  sheetName: TEACHER_IMPORT_SHEET_NAME,
  templateFilename: "plantilla-importar-profesores.xlsx",
  columns: TEACHER_IMPORT_COLUMNS,
  bulkOperationType: BulkOperationType.BULK_TEACHER_IMPORT,
  triggerTaskId: "bulk-import-teachers",
};
