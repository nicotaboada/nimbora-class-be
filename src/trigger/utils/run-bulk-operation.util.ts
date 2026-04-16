import { logger } from "@trigger.dev/sdk";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  BulkItemStatus,
  BulkOperationResultBase,
} from "../../bulk-operations/types/bulk-invoice.types";

interface RunBulkOperationArgs<TItem, TResult extends BulkOperationResultBase> {
  prisma: PrismaClient;
  operationId: string;
  items: TItem[];
  processItem: (item: TItem) => Promise<TResult>;
  buildFailureResult: (item: TItem, error: string) => TResult;
  logLabel: string;
}

export interface BulkCounters {
  completedItems: number;
  failedItems: number;
  skippedItems: number;
}

const STATUS_TO_COUNTER: Record<BulkItemStatus, keyof BulkCounters> = {
  created: "completedItems",
  emitted: "completedItems",
  skipped: "skippedItems",
  failed: "failedItems",
};

/**
 * Runner genérico para tasks de Trigger.dev que procesan items secuenciales
 * y persisten progreso incremental en la tabla BulkOperation.
 *
 * Maneja: PROCESSING → loop → push result + update incremental → COMPLETED.
 * El caller solo debe definir cómo procesar un item y cómo construir el
 * resultado de fallo (necesario porque cada tipo de item tiene shape distinto).
 */
export async function runBulkOperation<
  TItem,
  TResult extends BulkOperationResultBase,
>(args: RunBulkOperationArgs<TItem, TResult>): Promise<BulkCounters> {
  const {
    prisma,
    operationId,
    items,
    processItem,
    buildFailureResult,
    logLabel,
  } = args;

  await prisma.bulkOperation.update({
    where: { id: operationId },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  const results: TResult[] = [];
  const counters: BulkCounters = {
    completedItems: 0,
    failedItems: 0,
    skippedItems: 0,
  };

  for (const item of items) {
    let result: TResult;

    try {
      result = await processItem(item);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      logger.error(`${logLabel}: failed to process item`, {
        error: errorMessage,
      });
      result = buildFailureResult(item, errorMessage);
    }

    results.push(result);
    counters[STATUS_TO_COUNTER[result.status]]++;

    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: { ...counters, results: serializeResults(results) },
    });
  }

  await prisma.bulkOperation.update({
    where: { id: operationId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      ...counters,
      results: serializeResults(results),
    },
  });

  logger.info(`${logLabel}: bulk operation completed`, {
    operationId,
    ...counters,
  });

  return counters;
}

// Boundary helper: Prisma JSON columns expect InputJsonValue. Our results are
// plain serializable objects, so a structured clone gives Prisma a fresh array
// detached from the live reference.
function serializeResults<TResult extends BulkOperationResultBase>(
  results: TResult[],
): Prisma.InputJsonValue {
  return structuredClone(results) as unknown as Prisma.InputJsonValue;
}
