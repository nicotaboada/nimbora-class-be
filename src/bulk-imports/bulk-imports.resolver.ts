import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { BulkImportsService } from "./bulk-imports.service";
import { ValidateImportInput } from "./dto/validate-import.input";
import { ExecuteImportInput } from "./dto/execute-import.input";
import { ImportValidationResult } from "./entities/import-validation-result.entity";
import { ImportTemplateFile } from "./entities/import-template-file.entity";
import { BulkOperation } from "../bulk-operations/entities/bulk-operation.entity";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver()
@UseGuards(SupabaseAuthGuard)
export class BulkImportsResolver {
  constructor(private readonly bulkImportsService: BulkImportsService) {}

  @Query(() => ImportTemplateFile, {
    description: "Descarga la plantilla XLSX para importar alumnos",
  })
  downloadStudentImportTemplate(): Promise<ImportTemplateFile> {
    return this.bulkImportsService.downloadStudentImportTemplate();
  }

  @Mutation(() => ImportValidationResult, {
    description:
      "Valida un archivo XLSX de importación sin escribir en la DB (dry-run)",
  })
  validateBulkImport(
    @Args("input") input: ValidateImportInput,
    @CurrentUser() user: User,
  ): Promise<ImportValidationResult> {
    return this.bulkImportsService.validate(input, user.academyId);
  }

  @Mutation(() => BulkOperation, {
    description:
      "Ejecuta la importación masiva. Requiere que el archivo esté validado y sin errores.",
  })
  executeBulkImport(
    @Args("input") input: ExecuteImportInput,
    @CurrentUser() user: User,
  ): Promise<BulkOperation> {
    return this.bulkImportsService.execute(input, user.academyId);
  }
}
