import { task } from "@trigger.dev/sdk";
// Import enums from @prisma/client (not from "../common/enums") — our app
// enums pull in @nestjs/graphql for registerEnumType, which trigger.dev's
// esbuild bundler can't resolve cleanly when packaging the isolated task.
import {
  PrismaClient,
  Status,
  DocumentType,
  GuardianRelationship,
} from "@prisma/client";
import { runBulkImportTransaction } from "./utils/run-bulk-import-transaction.util";

const prisma = new PrismaClient();

interface FamilyImportPayloadGuardian {
  firstName: string;
  lastName: string;
  relationship: GuardianRelationship;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  documentType: DocumentType | null;
  documentNumber: string | null;
}

interface FamilyImportPayloadRow {
  rowNumber: number;
  code: string | null;
  name: string;
  guardian1: FamilyImportPayloadGuardian | null;
  guardian2: FamilyImportPayloadGuardian | null;
}

interface BulkImportFamiliesPayload {
  operationId: string;
  academyId: string;
  rows: FamilyImportPayloadRow[];
}

export const bulkImportFamiliesTask = task({
  id: "bulk-import-families",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkImportFamiliesPayload) => {
    const { operationId, academyId, rows } = payload;

    return runBulkImportTransaction({
      prisma,
      operationId,
      rows,
      logLabel: "bulk-import-families",
      createOne: async (tx, row) => {
        const family = await tx.family.create({
          data: {
            academyId,
            name: row.name,
            code: row.code,
            status: Status.ENABLED,
          },
          select: { id: true },
        });

        const guardians = [row.guardian1, row.guardian2].filter(
          (g): g is FamilyImportPayloadGuardian => g !== null,
        );

        if (guardians.length > 0) {
          await tx.familyGuardian.createMany({
            data: guardians.map((g) => ({
              academyId,
              familyId: family.id,
              firstName: g.firstName,
              lastName: g.lastName,
              relationship: g.relationship,
              email: g.email,
              phoneCountryCode: g.phoneCountryCode,
              phoneNumber: g.phoneNumber,
              documentType: g.documentType,
              documentNumber: g.documentNumber,
            })),
          });
        }

        return {
          code: row.code,
          familyId: family.id,
          guardianCount: guardians.length,
        };
      },
    });
  },
});
