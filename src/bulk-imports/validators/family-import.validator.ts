import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ImportEntityType } from "../enums/import-entity-type.enum";
import { ImportValidationError } from "../entities/import-validation-error.entity";
import {
  FamilyImportGuardian,
  FamilyImportRow,
} from "../types/family-import.types";
import {
  ImportValidator,
  ParsedRow,
  ValidationRunResult,
} from "./import-validator.interface";
import { parseGuardianRelationshipLabel } from "../../common/constants/guardian-relationships";
import { GuardianRelationship } from "../../families/enums/guardian-relationship.enum";
import { normalizeEmail } from "../utils/normalize-email.util";
import {
  normalizePhoneCountryCode,
  normalizePhoneNumber,
} from "../utils/normalize-phone.util";
import {
  normalizeDocumentType,
  normalizeDocumentNumber,
} from "../utils/normalize-document.util";

interface NormalizeResult {
  normalized?: FamilyImportRow;
  errors: ImportValidationError[];
}

type GuardianPrefix = "g1" | "g2";

interface GuardianHeaders {
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  documentType: string;
  documentNumber: string;
}

const GUARDIAN_HEADERS: Record<GuardianPrefix, GuardianHeaders> = {
  g1: {
    firstName: "Tutor 1 - Nombre",
    lastName: "Tutor 1 - Apellido",
    relationship: "Tutor 1 - Parentesco",
    email: "Tutor 1 - Email",
    phoneCountryCode: "Tutor 1 - Código país teléfono",
    phoneNumber: "Tutor 1 - Teléfono",
    documentType: "Tutor 1 - Tipo de documento",
    documentNumber: "Tutor 1 - Número de documento",
  },
  g2: {
    firstName: "Tutor 2 - Nombre",
    lastName: "Tutor 2 - Apellido",
    relationship: "Tutor 2 - Parentesco",
    email: "Tutor 2 - Email",
    phoneCountryCode: "Tutor 2 - Código país teléfono",
    phoneNumber: "Tutor 2 - Teléfono",
    documentType: "Tutor 2 - Tipo de documento",
    documentNumber: "Tutor 2 - Número de documento",
  },
};

@Injectable()
export class FamilyImportValidator implements ImportValidator<FamilyImportRow> {
  readonly entityType = ImportEntityType.FAMILY;

  constructor(private readonly prisma: PrismaService) {}

  serialize(row: FamilyImportRow): Record<string, unknown> {
    return { ...row };
  }

  async validate(
    parsedRows: ParsedRow[],
    academyId: string,
  ): Promise<ValidationRunResult<FamilyImportRow>> {
    const errors: ImportValidationError[] = [];
    const normalizedRows: FamilyImportRow[] = [];
    const validRowNumbers: number[] = [];
    const codeToRows = new Map<string, number[]>();
    const emailToRows = new Map<string, number[]>();

    for (const parsed of parsedRows) {
      const result = this.normalizeRow(parsed);
      errors.push(...result.errors);

      if (result.normalized) {
        if (result.normalized.code) {
          const codeKey = result.normalized.code.toLowerCase();
          const codeList = codeToRows.get(codeKey) ?? [];
          codeList.push(parsed.rowNumber);
          codeToRows.set(codeKey, codeList);
        }

        for (const guardian of [
          result.normalized.guardian1,
          result.normalized.guardian2,
        ]) {
          if (guardian?.email) {
            const emailKey = guardian.email.toLowerCase();
            const list = emailToRows.get(emailKey) ?? [];
            list.push(parsed.rowNumber);
            emailToRows.set(emailKey, list);
          }
        }

        normalizedRows.push(result.normalized);
        validRowNumbers.push(parsed.rowNumber);
      }
    }

    // Intra-file duplicates: code
    for (const [code, rows] of codeToRows.entries()) {
      if (rows.length > 1) {
        for (const row of rows) {
          errors.push({
            row,
            column: "Código",
            message: `Código duplicado en el archivo: ${code}`,
          });
        }
      }
    }

    // Intra-file duplicates: guardian email (across g1 and g2 of all rows)
    for (const [email, rows] of emailToRows.entries()) {
      if (rows.length > 1) {
        for (const row of rows) {
          errors.push({
            row,
            column: "Email",
            message: `Email de tutor duplicado en el archivo: ${email}`,
          });
        }
      }
    }

    // DB duplicates: codes already registered in Family for this academy
    const codesToCheck = [...codeToRows.keys()];
    if (codesToCheck.length > 0) {
      const existing = await this.prisma.family.findMany({
        where: {
          academyId,
          code: { in: codesToCheck, mode: "insensitive" },
        },
        select: { code: true },
      });
      const existingSet = new Set(
        existing.map((f) => (f.code ?? "").toLowerCase()).filter(Boolean),
      );
      for (const [code, rows] of codeToRows.entries()) {
        if (existingSet.has(code)) {
          for (const row of rows) {
            errors.push({
              row,
              column: "Código",
              message: `El código '${code}' ya existe en otra familia de la academia`,
            });
          }
        }
      }
    }

    // DB duplicates: emails cross-entidad (Student / Teacher / FamilyGuardian)
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
    const finalNormalized: FamilyImportRow[] = [];
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
    const get = (key: string): string | null => {
      const raw = row.cells[key];
      if (raw === null || raw === undefined) return null;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    const addError = (column: string, message: string) => {
      errors.push({ row: row.rowNumber, column, message });
    };

    const code = get("code");
    if (code && code.length > 100) addError("Código", "Máximo 100 caracteres");

    const name = get("name");
    if (!name) addError("Nombre de la familia", "Campo requerido");
    else if (name.length > 200)
      addError("Nombre de la familia", "Máximo 200 caracteres");

    const guardian1 = this.normalizeGuardian("g1", row, errors);
    const guardian2 = this.normalizeGuardian("g2", row, errors);

    if (errors.length > 0 || !name) {
      return { errors };
    }

    return {
      errors,
      normalized: {
        code,
        name,
        guardian1,
        guardian2,
      },
    };
  }

  /**
   * Normalize a guardian block (g1 or g2). Both are optional at the block
   * level: if no field is filled, returns null. If any field is filled, the
   * required fields (firstName, lastName, relationship) kick in — you can't
   * submit a half-filled guardian.
   */
  private normalizeGuardian(
    prefix: GuardianPrefix,
    row: ParsedRow,
    errors: ImportValidationError[],
  ): FamilyImportGuardian | null {
    const headers = GUARDIAN_HEADERS[prefix];
    const get = (key: string): string | null => {
      const raw = row.cells[`${prefix}_${key}`];
      if (raw === null || raw === undefined) return null;
      const trimmed = raw.trim();
      return trimmed.length === 0 ? null : trimmed;
    };
    const addError = (column: string, message: string) => {
      errors.push({ row: row.rowNumber, column, message });
    };

    const firstName = get("firstName");
    const lastName = get("lastName");
    const rawRelationship = get("relationship");
    const rawEmail = get("email");
    const rawPhoneCode = get("phoneCountryCode");
    const rawPhone = get("phoneNumber");
    const rawDocType = get("documentType");
    const rawDocNumber = get("documentNumber");

    const hasAnyField =
      firstName !== null ||
      lastName !== null ||
      rawRelationship !== null ||
      rawEmail !== null ||
      rawPhoneCode !== null ||
      rawPhone !== null ||
      rawDocType !== null ||
      rawDocNumber !== null;

    if (!hasAnyField) return null;

    // Required fields
    if (!firstName) addError(headers.firstName, "Campo requerido");
    else if (firstName.length > 100)
      addError(headers.firstName, "Máximo 100 caracteres");

    if (!lastName) addError(headers.lastName, "Campo requerido");
    else if (lastName.length > 100)
      addError(headers.lastName, "Máximo 100 caracteres");

    let relationship: GuardianRelationship | null = null;
    if (rawRelationship) {
      relationship = parseGuardianRelationshipLabel(rawRelationship);
      if (!relationship) addError(headers.relationship, "Valor inválido");
    } else {
      addError(headers.relationship, "Campo requerido");
    }

    // Optional fields
    const email = normalizeEmail(rawEmail, headers.email, addError);

    const phoneCountryCode = normalizePhoneCountryCode(
      rawPhoneCode,
      headers.phoneCountryCode,
      addError,
    );

    const phoneNumber = normalizePhoneNumber(
      rawPhone,
      headers.phoneNumber,
      addError,
    );

    const documentType = normalizeDocumentType(
      rawDocType,
      headers.documentType,
      addError,
    );

    const documentNumber = normalizeDocumentNumber(
      rawDocNumber,
      documentType,
      headers.documentNumber,
      addError,
    );

    if (!firstName || !lastName || !relationship) {
      return null;
    }

    return {
      firstName,
      lastName,
      relationship,
      email,
      phoneCountryCode,
      phoneNumber,
      documentType,
      documentNumber,
    };
  }
}
