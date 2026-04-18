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
  normalized?: StudentImportRow;
  classCodes: string[];
  familyCode: string | null;
  errors: ImportValidationError[];
}

interface ClassLookup {
  id: string;
  capacity: number | null;
  currentCount: number;
}

@Injectable()
export class StudentImportValidator
  implements ImportValidator<StudentImportRow>
{
  readonly entityType = ImportEntityType.STUDENT;

  constructor(private readonly prisma: PrismaService) {}

  serialize(row: StudentImportRow): Record<string, unknown> {
    return {
      ...row,
      birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    };
  }

  async validate(
    parsedRows: ParsedRow[],
    academyId: string,
  ): Promise<ValidationRunResult<StudentImportRow>> {
    const errors: ImportValidationError[] = [];
    const warnings: ImportValidationError[] = [];
    const normalizedRows: StudentImportRow[] = [];
    const validRowNumbers: number[] = [];
    const rowClassCodes: string[][] = [];
    const rowFamilyCodes: (string | null)[] = [];
    const emailToRows = new Map<string, number[]>();

    for (const parsed of parsedRows) {
      const result = this.normalizeRow(parsed);
      errors.push(...result.errors);

      if (result.normalized) {
        if (result.normalized.email) {
          const emailKey = result.normalized.email.toLowerCase();
          const existing = emailToRows.get(emailKey) ?? [];
          existing.push(parsed.rowNumber);
          emailToRows.set(emailKey, existing);
        }

        normalizedRows.push(result.normalized);
        validRowNumbers.push(parsed.rowNumber);
        rowClassCodes.push(result.classCodes);
        rowFamilyCodes.push(result.familyCode);
      }
    }

    // Resolve class codes against the DB (single query) and attach classIds
    // to each normalized row. Missing codes become row errors.
    const allCodes = [...new Set(rowClassCodes.flat())];
    const codeToClass = new Map<string, ClassLookup>();
    if (allCodes.length > 0) {
      const classes = await this.prisma.class.findMany({
        where: { academyId, code: { in: allCodes } },
        select: {
          id: true,
          code: true,
          capacity: true,
          _count: { select: { students: true } },
        },
      });
      for (const c of classes) {
        if (c.code) {
          codeToClass.set(c.code, {
            id: c.id,
            capacity: c.capacity,
            currentCount: c._count.students,
          });
        }
      }
    }

    const pendingByClassId = new Map<string, number>();
    for (const [i, normalizedRow] of normalizedRows.entries()) {
      const codes = rowClassCodes[i];
      const rowNumber = validRowNumbers[i];
      const classIds: string[] = [];
      for (const code of codes) {
        const match = codeToClass.get(code);
        if (!match) {
          errors.push({
            row: rowNumber,
            column: "Códigos de clase (separados por coma)",
            message: `El código '${code}' no existe en la academia`,
          });
          continue;
        }
        classIds.push(match.id);
        pendingByClassId.set(
          match.id,
          (pendingByClassId.get(match.id) ?? 0) + 1,
        );
      }
      normalizedRow.classIds = classIds;
    }

    // Capacity warnings (non-blocking)
    for (const [classId, pending] of pendingByClassId.entries()) {
      const info = [...codeToClass.values()].find((c) => c.id === classId);
      if (!info || info.capacity == null) continue;
      const projected = info.currentCount + pending;
      if (projected > info.capacity) {
        const code =
          [...codeToClass.entries()].find(([, c]) => c.id === classId)?.[0] ??
          "";
        warnings.push({
          row: 0,
          column: "Códigos de clase (separados por coma)",
          message: `La clase '${code}' tendría ${projected} alumnos pero su capacidad es ${info.capacity}`,
        });
      }
    }

    // Resolve family codes against the DB (single query) and attach familyId.
    // Missing codes become row errors.
    const allFamilyCodes = [
      ...new Set(rowFamilyCodes.filter((c): c is string => c !== null)),
    ];
    const codeToFamilyId = new Map<string, string>();
    if (allFamilyCodes.length > 0) {
      const families = await this.prisma.family.findMany({
        where: { academyId, code: { in: allFamilyCodes } },
        select: { id: true, code: true },
      });
      for (const f of families) {
        if (f.code) codeToFamilyId.set(f.code, f.id);
      }
    }

    for (const [i, normalizedRow] of normalizedRows.entries()) {
      const familyCode = rowFamilyCodes[i];
      if (!familyCode) continue;
      const familyId = codeToFamilyId.get(familyCode);
      if (!familyId) {
        errors.push({
          row: validRowNumbers[i],
          column: "Código de familia",
          message: `La familia con código '${familyCode}' no existe en la academia`,
        });
        continue;
      }
      normalizedRow.familyId = familyId;
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

    // Drop rows that have any blocking error (email collision or unresolved class code).
    const invalidatedRows = new Set<number>();
    for (const err of errors) {
      invalidatedRows.add(err.row);
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
      warnings,
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

    // Optional — class codes (comma-separated). Split, trim, dedupe intra-row.
    // Actual existence / capacity are resolved globally in validate().
    const rawClassCodes = get("classCodes");
    const classCodes: string[] = rawClassCodes
      ? [
          ...new Set(
            rawClassCodes
              .split(",")
              .map((c) => c.trim())
              .filter((c) => c.length > 0),
          ),
        ]
      : [];

    // Optional — family code (single). Existence is resolved globally.
    const familyCode = get("familyCode");

    if (errors.length > 0) {
      return { classCodes, familyCode, errors };
    }

    return {
      errors,
      classCodes,
      familyCode,
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
        classIds: [],
        familyId: null,
      },
    };
  }
}
