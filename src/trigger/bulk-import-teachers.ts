import { task } from "@trigger.dev/sdk";
// Import enums from @prisma/client (not from "../common/enums") — our app
// enums pull in @nestjs/graphql for registerEnumType, which trigger.dev's
// esbuild bundler can't resolve cleanly when packaging the isolated task.
import { PrismaClient, Status, Gender, DocumentType } from "@prisma/client";
import { runBulkImportTransaction } from "./utils/run-bulk-import-transaction.util";

const prisma = new PrismaClient();

/**
 * Payload row: the validated and normalized teacher data, with the original
 * XLSX row number for traceability, and birthDate serialized as ISO string.
 * Email is nullable (Teacher allows it).
 */
interface TeacherImportPayloadRow {
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
}

interface BulkImportTeachersPayload {
  operationId: string;
  academyId: string;
  rows: TeacherImportPayloadRow[];
}

export const bulkImportTeachersTask = task({
  id: "bulk-import-teachers",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkImportTeachersPayload) => {
    const { operationId, academyId, rows } = payload;

    return runBulkImportTransaction({
      prisma,
      operationId,
      rows,
      logLabel: "bulk-import-teachers",
      createOne: async (tx, row) => {
        const teacher = await tx.teacher.create({
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
          },
          select: { id: true },
        });
        return { email: row.email, teacherId: teacher.id };
      },
    });
  },
});
