import { task } from "@trigger.dev/sdk";
// Import enums from @prisma/client (not from "../common/enums") — our app
// enums pull in @nestjs/graphql for registerEnumType, which trigger.dev's
// esbuild bundler can't resolve cleanly when packaging the isolated task.
import { PrismaClient, Status, Gender, DocumentType } from "@prisma/client";
import { runBulkImportTransaction } from "./utils/run-bulk-import-transaction.util";

const prisma = new PrismaClient();

/**
 * Payload row: the validated and normalized student data, with the original
 * XLSX row number for traceability, and birthDate serialized as ISO string.
 */
interface StudentImportPayloadRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  gender: Gender | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  classIds: string[];
  familyId: string | null;
}

interface BulkImportStudentsPayload {
  operationId: string;
  academyId: string;
  rows: StudentImportPayloadRow[];
}

export const bulkImportStudentsTask = task({
  id: "bulk-import-students",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkImportStudentsPayload) => {
    const { operationId, academyId, rows } = payload;

    return runBulkImportTransaction({
      prisma,
      operationId,
      rows,
      logLabel: "bulk-import-students",
      createOne: async (tx, row) => {
        const student = await tx.student.create({
          data: {
            academyId,
            status: Status.ENABLED,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phoneCountryCode: row.phoneCountryCode,
            phoneNumber: row.phoneNumber,
            birthDate: row.birthDate ? new Date(row.birthDate) : null,
            gender: row.gender,
            documentType: row.documentType,
            documentNumber: row.documentNumber,
            address: row.address,
            city: row.city,
            country: row.country,
            postalCode: row.postalCode,
            familyId: row.familyId,
          },
          select: { id: true },
        });

        if (row.classIds.length > 0) {
          await tx.classStudent.createMany({
            data: row.classIds.map((classId) => ({
              classId,
              studentId: student.id,
            })),
          });
        }

        return { email: row.email, studentId: student.id };
      },
    });
  },
});
