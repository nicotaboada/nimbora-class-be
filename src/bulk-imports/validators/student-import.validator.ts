import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ImportEntityType } from "../enums/import-entity-type.enum";
import { ImportValidationError } from "../entities/import-validation-error.entity";
import { StudentImportRow } from "../types/student-import.types";
import {
  ImportValidator,
  ParsedRow,
  ValidationRunResult,
} from "./import-validator.interface";
import {
  parseCountryDropdownLabel,
  isValidCountryCode,
} from "../../common/constants/countries";
import {
  parsePhoneCodeDropdownLabel,
  isValidPhoneCode,
} from "../../common/constants/phone-codes";
import { parseDocumentTypeLabel } from "../../common/constants/document-types";
import { parseGenderLabel } from "../../common/constants/genders";
import { DocumentType, Gender } from "../../common/enums";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[()\d\s-]+$/;
const MIN_BIRTH_YEAR = 1900;

interface NormalizeResult {
  normalized?: StudentImportRow;
  errors: ImportValidationError[];
}

@Injectable()
export class StudentImportValidator
  implements ImportValidator<StudentImportRow>
{
  readonly entityType = ImportEntityType.STUDENT;

  constructor(private readonly prisma: PrismaService) {}

  async validate(
    parsedRows: ParsedRow[],
    academyId: string,
  ): Promise<ValidationRunResult<StudentImportRow>> {
    const errors: ImportValidationError[] = [];
    const normalizedRows: StudentImportRow[] = [];
    const validRowNumbers: number[] = [];
    const emailToRows = new Map<string, number[]>();

    for (const parsed of parsedRows) {
      const result = this.normalizeRow(parsed);
      errors.push(...result.errors);

      if (result.normalized) {
        const emailKey = result.normalized.email.toLowerCase();
        const existing = emailToRows.get(emailKey) ?? [];
        existing.push(parsed.rowNumber);
        emailToRows.set(emailKey, existing);

        normalizedRows.push(result.normalized);
        validRowNumbers.push(parsed.rowNumber);
      }
    }

    // Intra-file duplicates
    for (const [email, rows] of emailToRows.entries()) {
      if (rows.length > 1) {
        for (const row of rows) {
          errors.push({
            row,
            column: "Email",
            message: `Email duplicado en el archivo: ${email}`,
          });
        }
      }
    }

    // DB duplicates cross-entidad (Student/Teacher/FamilyGuardian)
    const emailsToCheck = [...emailToRows.keys()];
    if (emailsToCheck.length > 0) {
      const emailFilter = { in: emailsToCheck, mode: "insensitive" as const };
      const [students, teachers, guardians] = await Promise.all([
        this.prisma.student.findMany({
          where: { academyId, email: emailFilter },
          select: { email: true },
        }),
        this.prisma.teacher.findMany({
          where: { academyId, email: emailFilter },
          select: { email: true },
        }),
        this.prisma.familyGuardian.findMany({
          where: { academyId, email: emailFilter },
          select: { email: true },
        }),
      ]);

      const existingIn = new Map<string, string[]>();
      const addHit = (entity: string, email: string | null) => {
        if (!email) return;
        const key = email.toLowerCase();
        const list = existingIn.get(key) ?? [];
        list.push(entity);
        existingIn.set(key, list);
      };
      for (const s of students) addHit("un estudiante", s.email);
      for (const t of teachers) addHit("un profesor", t.email);
      for (const g of guardians) addHit("un tutor", g.email);

      for (const [email, rows] of emailToRows.entries()) {
        const hits = existingIn.get(email);
        if (!hits || hits.length === 0) continue;
        const label = [...new Set(hits)].join(", ");
        for (const row of rows) {
          errors.push({
            row,
            column: "Email",
            message: `Email ${email} ya está registrado para ${label} en esta academia`,
          });
        }
      }
    }

    // Filter out rows whose email collided (intra-file or DB) from the normalized set
    const invalidatedRows = new Set<number>();
    for (const err of errors) {
      if (err.column === "Email") invalidatedRows.add(err.row);
    }
    const finalNormalized: StudentImportRow[] = [];
    const finalValidRowNumbers: number[] = [];
    for (const [i, normalizedRow] of normalizedRows.entries()) {
      if (!invalidatedRows.has(validRowNumbers[i])) {
        finalNormalized.push(normalizedRow);
        finalValidRowNumbers.push(validRowNumbers[i]);
      }
    }

    return {
      totalRows: parsedRows.length,
      normalizedRows: finalNormalized,
      validRowNumbers: finalValidRowNumbers,
      errors,
    };
  }

  private normalizeRow(row: ParsedRow): NormalizeResult {
    const errors: ImportValidationError[] = [];
    const get = (header: string): string | null => {
      const raw = row.cells[header];
      if (raw === null || raw === undefined) return null;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    const addError = (column: string, message: string) => {
      errors.push({ row: row.rowNumber, column, message });
    };

    // Required
    const firstName = get("Nombre");
    if (!firstName) addError("Nombre", "Campo requerido");
    else if (firstName.length > 100)
      addError("Nombre", "Máximo 100 caracteres");

    const lastName = get("Apellido");
    if (!lastName) addError("Apellido", "Campo requerido");
    else if (lastName.length > 100)
      addError("Apellido", "Máximo 100 caracteres");

    const rawEmail = get("Email");
    let email: string | null = null;
    if (!rawEmail) {
      addError("Email", "Campo requerido");
    } else if (EMAIL_REGEX.test(rawEmail)) {
      email = rawEmail.toLowerCase();
    } else {
      addError("Email", "Formato inválido");
    }

    // Optional — phone country code (dropdown label → "+XX")
    const rawPhoneCode = get("Código país teléfono");
    let phoneCountryCode: string | null = null;
    if (rawPhoneCode) {
      const parsedCode = parsePhoneCodeDropdownLabel(rawPhoneCode);
      if (parsedCode) {
        phoneCountryCode = parsedCode;
      } else if (
        rawPhoneCode.startsWith("+") &&
        isValidPhoneCode(rawPhoneCode)
      ) {
        phoneCountryCode = rawPhoneCode;
      } else {
        addError("Código país teléfono", "Valor inválido");
      }
    }

    // Optional — phone number (only digits and visual separators; the "+"
    // country prefix belongs in the Código país teléfono column).
    const rawPhone = get("Teléfono");
    let phoneNumber: string | null = null;
    if (rawPhone) {
      if (rawPhone.includes("+")) {
        addError(
          "Teléfono",
          "Solo números (el código de país va en la columna 'Código país teléfono')",
        );
      } else if (PHONE_REGEX.test(rawPhone)) {
        phoneNumber = rawPhone.replaceAll(/[\s()-]/g, "");
      } else {
        addError("Teléfono", "Solo se permiten números");
      }
    }

    // Optional — birth date (DD/MM/AAAA)
    const rawBirthDate = get("Fecha de nacimiento (DD/MM/AAAA)");
    let birthDate: Date | null = null;
    if (rawBirthDate) {
      const parsedDate = parseDateDDMMYYYY(rawBirthDate);
      if (!parsedDate) {
        addError(
          "Fecha de nacimiento (DD/MM/AAAA)",
          "Formato inválido, usar DD/MM/AAAA",
        );
      } else if (parsedDate > new Date()) {
        addError(
          "Fecha de nacimiento (DD/MM/AAAA)",
          "La fecha no puede ser futura",
        );
      } else if (parsedDate.getUTCFullYear() < MIN_BIRTH_YEAR) {
        addError(
          "Fecha de nacimiento (DD/MM/AAAA)",
          `El año no puede ser anterior a ${MIN_BIRTH_YEAR}`,
        );
      } else {
        birthDate = parsedDate;
      }
    }

    // Optional — gender (dropdown label → enum)
    const rawGender = get("Género");
    let gender: Gender | null = null;
    if (rawGender) {
      gender = parseGenderLabel(rawGender);
      if (!gender) addError("Género", "Valor inválido");
    }

    // Optional — document type (dropdown label → enum)
    const rawDocType = get("Tipo de documento");
    let documentType: DocumentType | null = null;
    if (rawDocType) {
      documentType = parseDocumentTypeLabel(rawDocType);
      if (!documentType) addError("Tipo de documento", "Valor inválido");
    }

    // Optional — document number (validation depends on documentType)
    const rawDocNumber = get("Número de documento");
    let documentNumber: string | null = null;
    if (rawDocNumber) {
      if (
        documentType === DocumentType.DNI &&
        !/^\d{7,8}$/.test(rawDocNumber)
      ) {
        addError("Número de documento", "DNI debe tener 7 u 8 dígitos");
      } else if (
        documentType === DocumentType.OTHER &&
        rawDocNumber.length > 40
      ) {
        addError("Número de documento", "Máximo 40 caracteres");
      } else {
        documentNumber = rawDocNumber;
      }
    }

    // Optional — country (dropdown label → ISO code)
    const rawCountry = get("País");
    let country: string | null = null;
    if (rawCountry) {
      const parsedCountry = parseCountryDropdownLabel(rawCountry);
      if (parsedCountry) {
        country = parsedCountry;
      } else if (isValidCountryCode(rawCountry)) {
        country = rawCountry;
      } else {
        addError("País", "Valor inválido");
      }
    }

    const address = get("Dirección");
    const city = get("Ciudad");
    const postalCode = get("Código postal");

    if (errors.length > 0) {
      return { errors };
    }

    return {
      errors,
      normalized: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneCountryCode,
        phoneNumber,
        birthDate,
        gender,
        documentType,
        documentNumber,
        address,
        city,
        country,
        postalCode,
      },
    };
  }
}

/** Parse DD/MM/YYYY into a Date at UTC midnight, or null if malformed. */
function parseDateDDMMYYYY(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
