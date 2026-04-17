import { task, logger } from "@trigger.dev/sdk";
// Import enums from @prisma/client (not from "../common/enums") — our app
// enums pull in @nestjs/graphql for registerEnumType, which trigger.dev's
// esbuild bundler can't resolve cleanly when packaging the isolated task.
import { PrismaClient, Prisma, Status } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Payload row: the validated and normalized student data, with the original
 * XLSX row number for traceability, and birthDate serialized as ISO string.
 */
interface StudentImportPayloadRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  gender: string | null;
  documentType: string | null;
  documentNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
}

interface BulkImportStudentsPayload {
  operationId: string;
  academyId: string;
  rows: StudentImportPayloadRow[];
}

interface ImportResult {
  rowNumber: number;
  email: string;
  studentId: string;
  status: "imported";
}

// Transactions longer than 5s are common for imports of hundreds of rows;
// bump the Prisma interactive-transaction timeout (ms).
const TRANSACTION_TIMEOUT_MS = 120_000;
const TRANSACTION_MAX_WAIT_MS = 10_000;

export const bulkImportStudentsTask = task({
  id: "bulk-import-students",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkImportStudentsPayload) => {
    const { operationId, academyId, rows } = payload;

    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    try {
      const results = await prisma.$transaction(
        async (tx) => {
          const created: ImportResult[] = [];
          for (const row of rows) {
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
                gender: row.gender as Prisma.StudentCreateInput["gender"],
                documentType:
                  row.documentType as Prisma.StudentCreateInput["documentType"],
                documentNumber: row.documentNumber,
                address: row.address,
                city: row.city,
                country: row.country,
                postalCode: row.postalCode,
              },
              select: { id: true },
            });

            created.push({
              rowNumber: row.rowNumber,
              email: row.email,
              studentId: student.id,
              status: "imported",
            });
          }
          return created;
        },
        {
          timeout: TRANSACTION_TIMEOUT_MS,
          maxWait: TRANSACTION_MAX_WAIT_MS,
        },
      );

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedItems: results.length,
          failedItems: 0,
          results: structuredClone(results) as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info("bulk-import-students: completed", {
        operationId,
        count: results.length,
      });

      return { completedItems: results.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      logger.error("bulk-import-students: failed", {
        operationId,
        error: message,
      });

      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          failedItems: rows.length,
          results: [{ error: message }] as unknown as Prisma.InputJsonValue,
        },
      });

      throw error;
    }
  },
});
