import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { tasks } from "@trigger.dev/sdk";
import { PrismaService } from "../prisma/prisma.service";
import { XlsxParserService } from "./services/xlsx-parser.service";
import { TemplateGeneratorService } from "./services/template-generator.service";
import {
  ImportValidator,
  IMPORT_VALIDATORS,
  ParsedRow,
} from "./validators/import-validator.interface";
import {
  formatColumnHeader,
  EntityImportConfig,
} from "./config/entity-import-config";
import { getEntityImportConfig } from "./config/entity-import-registry";
import { ImportEntityType } from "./enums/import-entity-type.enum";
import { ImportValidationResult } from "./entities/import-validation-result.entity";
import { ImportTemplateFile } from "./entities/import-template-file.entity";
import { ValidateImportInput } from "./dto/validate-import.input";
import { ExecuteImportInput } from "./dto/execute-import.input";
import { BulkOperation } from "../bulk-operations/entities/bulk-operation.entity";
import { BulkOperationType } from "../bulk-operations/enums/bulk-operation-type.enum";
import { BulkOperationStatus } from "../bulk-operations/enums/bulk-operation-status.enum";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

@Injectable()
export class BulkImportsService {
  private readonly validators: Map<ImportEntityType, ImportValidator<unknown>>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly xlsxParser: XlsxParserService,
    private readonly templateGenerator: TemplateGeneratorService,
    @Inject(IMPORT_VALIDATORS)
    validators: ImportValidator<unknown>[],
  ) {
    this.validators = new Map(validators.map((v) => [v.entityType, v]));
  }

  async downloadImportTemplate(
    entityType: ImportEntityType,
  ): Promise<ImportTemplateFile> {
    const config = getEntityImportConfig(entityType);
    const buffer = await this.templateGenerator.generate(config);
    return {
      filename: config.templateFilename,
      mimeType: XLSX_MIME_TYPE,
      fileBase64: buffer.toString("base64"),
    };
  }

  async validate(
    input: ValidateImportInput,
    academyId: string,
  ): Promise<ImportValidationResult> {
    const config = getEntityImportConfig(input.entityType);
    const validator = this.getValidator(input.entityType);

    const parsedRows = await this.parseFile(input.fileBase64, config);
    const { totalRows, validRowNumbers, errors, warnings } =
      await validator.validate(parsedRows, academyId);

    return {
      totalRows,
      validRows: validRowNumbers.length,
      invalidRows: totalRows - validRowNumbers.length,
      errors,
      warnings,
    };
  }

  async execute(
    input: ExecuteImportInput,
    academyId: string,
  ): Promise<BulkOperation> {
    const config = getEntityImportConfig(input.entityType);
    const validator = this.getValidator(input.entityType);

    const parsedRows = await this.parseFile(input.fileBase64, config);

    // Re-validate server-side for safety: the client-side dry-run result
    // could be stale if other admins added students between validate and execute.
    const { totalRows, normalizedRows, validRowNumbers, errors } =
      await validator.validate(parsedRows, academyId);

    if (errors.length > 0) {
      throw new BadRequestException(
        "El archivo tiene errores. Corregilos antes de importar.",
      );
    }

    const serializedRows = normalizedRows.map((row, idx) => ({
      ...validator.serialize(row),
      rowNumber: validRowNumbers[idx],
    }));

    const operation = await this.prisma.bulkOperation.create({
      data: {
        type: config.bulkOperationType,
        status: BulkOperationStatus.PENDING,
        academyId,
        totalItems: totalRows,
        params: {
          entityType: input.entityType,
          rows: serializedRows,
        },
        results: [],
      },
    });

    const handle = await tasks.trigger(config.triggerTaskId, {
      operationId: operation.id,
      academyId,
      rows: serializedRows,
    });

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

  private async parseFile(
    fileBase64: string,
    config: EntityImportConfig,
  ): Promise<ParsedRow[]> {
    const parsedRows = await this.xlsxParser.parse(
      fileBase64,
      config.sheetName,
      config.columns.map((c) => ({
        key: c.key,
        header: formatColumnHeader(c),
        example: c.example,
      })),
    );

    if (parsedRows.length === 0) {
      throw new BadRequestException("El archivo no tiene filas de datos");
    }

    return parsedRows;
  }

  private getValidator(entityType: ImportEntityType): ImportValidator<unknown> {
    const validator = this.validators.get(entityType);
    if (!validator) {
      throw new BadRequestException(
        `No hay validador registrado para la entidad ${entityType}`,
      );
    }
    return validator;
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
