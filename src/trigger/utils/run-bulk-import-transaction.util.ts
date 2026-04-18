import { logger } from "@trigger.dev/sdk";
import { Prisma, PrismaClient } from "@prisma/client";

// Transactions longer than 5s are common for imports of hundreds of rows;
// bump the Prisma interactive-transaction timeout (ms).
const TRANSACTION_TIMEOUT_MS = 120_000;
const TRANSACTION_MAX_WAIT_MS = 10_000;

interface RunBulkImportTransactionArgs<
  TRow extends { rowNumber: number },
  TMeta extends Record<string, unknown>,
> {
  prisma: PrismaClient;
  operationId: string;
  rows: TRow[];
  createOne: (tx: Prisma.TransactionClient, row: TRow) => Promise<TMeta>;
  logLabel: string;
}

/**
 * Runner for bulk-import tasks that need all-or-nothing semantics: every
 * row is created inside a single Prisma interactive transaction. If any
 * row throws, the transaction rolls back and the BulkOperation lands in
 * FAILED (the caller doesn't need to handle rollback or status updates).
 *
 * Contrast with runBulkOperation (per-item progress, tolerates partial
 * failure), which is the right shape for bulk invoicing where individual
 * charges can be skipped independently.
 */
export async function runBulkImportTransaction<
  TRow extends { rowNumber: number },
  TMeta extends Record<string, unknown>,
>(
  args: RunBulkImportTransactionArgs<TRow, TMeta>,
): Promise<{ completedItems: number }> {
  const { prisma, operationId, rows, createOne, logLabel } = args;

  await prisma.bulkOperation.update({
    where: { id: operationId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    const results = await prisma.$transaction(
      async (tx) => {
        const created: Array<
          TMeta & { rowNumber: number; status: "imported" }
        > = [];
        for (const row of rows) {
          const meta = await createOne(tx, row);
          created.push({
            ...meta,
            rowNumber: row.rowNumber,
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

    logger.info(`${logLabel}: completed`, {
      operationId,
      count: results.length,
    });

    return { completedItems: results.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error(`${logLabel}: failed`, {
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
}
