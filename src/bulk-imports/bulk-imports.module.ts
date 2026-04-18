import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BulkImportsService } from "./bulk-imports.service";
import { BulkImportsResolver } from "./bulk-imports.resolver";
import { XlsxParserService } from "./services/xlsx-parser.service";
import { TemplateGeneratorService } from "./services/template-generator.service";
import { StudentImportValidator } from "./validators/student-import.validator";
import { TeacherImportValidator } from "./validators/teacher-import.validator";
import { FamilyImportValidator } from "./validators/family-import.validator";
import { IMPORT_VALIDATORS } from "./validators/import-validator.interface";

@Module({
  imports: [AuthModule],
  providers: [
    BulkImportsService,
    BulkImportsResolver,
    XlsxParserService,
    TemplateGeneratorService,
    StudentImportValidator,
    TeacherImportValidator,
    FamilyImportValidator,
    // Aggregate all registered validators into a single array the service can
    // index by entityType. Adding a new entity = add its validator class here
    // (as a provider and as a factory dependency).
    {
      provide: IMPORT_VALIDATORS,
      useFactory: (
        studentValidator: StudentImportValidator,
        teacherValidator: TeacherImportValidator,
        familyValidator: FamilyImportValidator,
      ) => [studentValidator, teacherValidator, familyValidator],
      inject: [
        StudentImportValidator,
        TeacherImportValidator,
        FamilyImportValidator,
      ],
    },
  ],
})
export class BulkImportsModule {}
