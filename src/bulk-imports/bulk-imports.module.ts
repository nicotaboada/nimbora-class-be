import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BulkImportsService } from "./bulk-imports.service";
import { BulkImportsResolver } from "./bulk-imports.resolver";
import { XlsxParserService } from "./services/xlsx-parser.service";
import { TemplateGeneratorService } from "./services/template-generator.service";
import { StudentImportValidator } from "./validators/student-import.validator";

@Module({
  imports: [AuthModule],
  providers: [
    BulkImportsService,
    BulkImportsResolver,
    XlsxParserService,
    TemplateGeneratorService,
    StudentImportValidator,
  ],
})
export class BulkImportsModule {}
