import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ImportEntityType } from "../enums/import-entity-type.enum";
import { ImportValidationError } from "../entities/import-validation-error.entity";
import { TeacherImportRow } from "../types/teacher-import.types";
import {
  ImportValidator,
  ParsedRow,
  ValidationRunResult,
} from "./import-validator.interface";
import { normalizeEmail } from "../utils/normalize-email.util";
import {
  normalizePhoneCountryCode,
  normalizePhoneNumber,
} from "../utils/normalize-phone.util";
import { normalizeBirthDate } from "../utils/normalize-birth-date.util";
import { normalizeGender } from "../utils/normalize-gender.util";
import {
  normalizeDocumentType,
  normalizeDocumentNumber,
} from "../utils/normalize-document.util";
import { normalizeCountry } from "../utils/normalize-country.util";

interface NormalizeResult {
  normalized?: TeacherImportRow;
  errors: ImportValidationError[];
}

@Injectable()
export class TeacherImportValidator
  implements ImportValidator<TeacherImportRow>
{
  readonly entityType = ImportEntityType.TEACHER;

  constructor(private readonly prisma: PrismaService) {}

  serialize(row: TeacherImportRow): Record<string, unknown> {
    return {
      ...row,
      birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    };
  }

  async validate(
    parsedRows: ParsedRow[],
    academyId: string,
  ): Promise<ValidationRunResult<TeacherImportRow>> {
    const errors: ImportValidationError[] = [];
    const normalizedRows: TeacherImportRow[] = [];
    const validRowNumbers: number[] = [];
    const emailToRows = new Map<string, number[]>();

    for (const parsed of parsedRows) {
      const result = this.normalizeRow(parsed);
      errors.push(...result.errors);

      if (result.normalized) {
        // Only rows that actually carry an email participate in the dup check.
        if (result.normalized.email) {
          const emailKey = result.normalized.email.toLowerCase();
          const existing = emailToRows.get(emailKey) ?? [];
          existing.push(parsed.rowNumber);
          emailToRows.set(emailKey, existing);
        }

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

    // Drop rows that collected any blocking error
    const invalidatedRows = new Set<number>();
    for (const err of errors) {
      invalidatedRows.add(err.row);
    }
    const finalNormalized: TeacherImportRow[] = [];
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
      warnings: [],
    };
  }

  private normalizeRow(row: ParsedRow): NormalizeResult {
    const errors: ImportValidationError[] = [];
    // Cells are indexed by ColumnSpec.key (e.g. "firstName"), not by header.
    const get = (key: string): string | null => {
      const raw = row.cells[key];
      if (raw === null || raw === undefined) return null;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    const addError = (column: string, message: string) => {
      errors.push({ row: row.rowNumber, column, message });
    };

    // Required
    const firstName = get("firstName");
    if (!firstName) addError("Nombre", "Campo requerido");
    else if (firstName.length > 100)
      addError("Nombre", "Máximo 100 caracteres");

    const lastName = get("lastName");
    if (!lastName) addError("Apellido", "Campo requerido");
    else if (lastName.length > 100)
      addError("Apellido", "Máximo 100 caracteres");

    const email = normalizeEmail(get("email"), "Email", addError);

    const phoneCountryCode = normalizePhoneCountryCode(
      get("phoneCountryCode"),
      "Código país teléfono",
      addError,
    );

    const phoneNumber = normalizePhoneNumber(
      get("phoneNumber"),
      "Teléfono",
      addError,
    );

    const birthDate = normalizeBirthDate(
      get("birthDate"),
      "Fecha de nacimiento (DD/MM/AAAA)",
      addError,
    );

    const gender = normalizeGender(get("gender"), "Género", addError);

    const documentType = normalizeDocumentType(
      get("documentType"),
      "Tipo de documento",
      addError,
    );

    const documentNumber = normalizeDocumentNumber(
      get("documentNumber"),
      documentType,
      "Número de documento",
      addError,
    );

    const country = normalizeCountry(get("country"), "País", addError);

    const address = get("address");
    const city = get("city");
    const postalCode = get("postalCode");

    if (errors.length > 0) {
      return { errors };
    }

    return {
      errors,
      normalized: {
        firstName: firstName,
        lastName: lastName,
        email,
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
