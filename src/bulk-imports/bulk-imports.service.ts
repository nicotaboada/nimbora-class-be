import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { tasks } from "@trigger.dev/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { XlsxParserService } from "./services/xlsx-parser.service";
import { TemplateGeneratorService } from "./services/template-generator.service";
import { StudentImportValidator } from "./validators/student-import.validator";
import {
  STUDENT_IMPORT_COLUMNS,
  STUDENT_IMPORT_SHEET_NAME,
  formatColumnHeader,
} from "./config/student-import.config";
import { ImportEntityType } from "./enums/import-entity-type.enum";
import { ImportValidationResult } from "./entities/import-validation-result.entity";
import { ImportTemplateFile } from "./entities/import-template-file.entity";
import { ValidateImportInput } from "./dto/validate-import.input";
import { ExecuteImportInput } from "./dto/execute-import.input";
import { BulkOperation } from "../bulk-operations/entities/bulk-operation.entity";
import { BulkOperationType } from "../bulk-operations/enums/bulk-operation-type.enum";
import { BulkOperationStatus } from "../bulk-operations/enums/bulk-operation-status.enum";
import type { bulkImportStudentsTask } from "../trigger/bulk-import-students";
import { StudentImportRow } from "./types/student-import.types";

const TEMPLATE_FILENAME = "plantilla-importar-alumnos.xlsx";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Same shape as StudentImportRow but with dates as ISO strings (for JSON). */
export interface SerializableStudentRow
  extends Omit<StudentImportRow, "birthDate"> {
  birthDate: string | null;
}

@Injectable()
export class BulkImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xlsxParser: XlsxParserService,
    private readonly templateGenerator: TemplateGeneratorService,
    private readonly studentValidator: StudentImportValidator,
  ) {}

  async downloadStudentImportTemplate(): Promise<ImportTemplateFile> {
    const buffer = await this.templateGenerator.generateStudentTemplate();
    return {
      filename: TEMPLATE_FILENAME,
      mimeType: XLSX_MIME_TYPE,
      fileBase64: buffer.toString("base64"),
    };
  }

  async validate(
    input: ValidateImportInput,
    academyId: string,
  ): Promise<ImportValidationResult> {
    this.assertSupportedEntity(input.entityType);

    const parsedRows = await this.xlsxParser.parse(
      input.fileBase64,
      STUDENT_IMPORT_SHEET_NAME,
      STUDENT_IMPORT_COLUMNS.map((c) => ({
        key: c.header,
        header: formatColumnHeader(c),
        example: c.example,
      })),
    );

    if (parsedRows.length === 0) {
      throw new BadRequestException("El archivo no tiene filas de datos");
    }

    const { totalRows, validRowNumbers, errors } =
      await this.studentValidator.validate(parsedRows, academyId);

    return {
      totalRows,
      validRows: validRowNumbers.length,
      invalidRows: totalRows - validRowNumbers.length,
      errors,
    };
  }

  async execute(
    input: ExecuteImportInput,
    academyId: string,
  ): Promise<BulkOperation> {
    this.assertSupportedEntity(input.entityType);

    const parsedRows = await this.xlsxParser.parse(
      input.fileBase64,
      STUDENT_IMPORT_SHEET_NAME,
      STUDENT_IMPORT_COLUMNS.map((c) => ({
        key: c.header,
        header: formatColumnHeader(c),
        example: c.example,
      })),
    );

    if (parsedRows.length === 0) {
      throw new BadRequestException("El archivo no tiene filas de datos");
    }

    // Re-validate server-side for safety: the client-side dry-run result
    // could be stale if other admins added students between validate and execute.
    const { totalRows, normalizedRows, validRowNumbers, errors } =
      await this.studentValidator.validate(parsedRows, academyId);

    if (errors.length > 0) {
      throw new BadRequestException(
        "El archivo tiene errores. Corregilos antes de importar.",
      );
    }

    const serializableRows: SerializableStudentRow[] = normalizedRows.map(
      (row) => ({
        ...row,
        birthDate: row.birthDate ? row.birthDate.toISOString() : null,
      }),
    );

    const operation = await this.prisma.bulkOperation.create({
      data: {
        type: BulkOperationType.BULK_STUDENT_IMPORT,
        status: BulkOperationStatus.PENDING,
        academyId,
        totalItems: totalRows,
        params: {
          entityType: input.entityType,
          rows: serializableRows.map((row, idx) => ({
            ...row,
            rowNumber: validRowNumbers[idx],
          })),
        },
        results: [],
      },
    });

    const handle = await tasks.trigger<typeof bulkImportStudentsTask>(
      "bulk-import-students",
      {
        operationId: operation.id,
        academyId,
        rows: serializableRows.map((row, idx) => ({
          ...row,
          rowNumber: validRowNumbers[idx],
        })),
      },
    );

    const updated = await this.prisma.bulkOperation.update({
      where: { id: operation.id },
      data: { triggerRunId: handle.id },
    });

    return this.mapToEntity(updated);
  }

  async findById(
    operationId: string,
    academyId: string,
  ): Promise<BulkOperation> {
    const operation = await this.prisma.bulkOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation || operation.academyId !== academyId) {
      throw new NotFoundException(`Operación ${operationId} no encontrada`);
    }

    return this.mapToEntity(operation);
  }

  private assertSupportedEntity(entityType: ImportEntityType): void {
    switch (entityType) {
      case ImportEntityType.STUDENT: {
        return;
      }
    }
  }

  private mapToEntity(operation: {
    id: string;
    type: string;
    status: string;
    totalItems: number;
    completedItems: number;
    failedItems: number;
    skippedItems: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }): BulkOperation {
    return {
      id: operation.id,
      type: operation.type as BulkOperationType,
      status: operation.status as BulkOperationStatus,
      totalItems: operation.totalItems,
      completedItems: operation.completedItems,
      failedItems: operation.failedItems,
      skippedItems: operation.skippedItems,
      results: [],
      afipResults: [],
      familyResults: [],
      startedAt: operation.startedAt ?? undefined,
      completedAt: operation.completedAt ?? undefined,
      createdAt: operation.createdAt,
    };
  }
}
