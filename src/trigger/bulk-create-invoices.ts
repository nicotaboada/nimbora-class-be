import { task, logger } from "@trigger.dev/sdk";
import {
  PrismaClient,
  ChargeStatus,
  InvoiceStatus,
  InvoiceLineType,
} from "@prisma/client";
import { LineDataToCreate } from "../invoices/types/invoice.types";

const prisma = new PrismaClient();

interface BulkInvoiceItem {
  studentId: string;
  chargeIds: string[];
}

interface BulkCreateInvoicesPayload {
  operationId: string;
  items: BulkInvoiceItem[];
  dueDate: string;
  academyId: string;
}
interface ItemResult {
  studentId: string;
  studentName: string;
  status: "created" | "skipped" | "failed";
  invoiceId?: string;
  error?: string;
}
// Prisma types for bulkOperation are available after running: prisma migrate dev + prisma generate
const bulkOp = (prisma as unknown as Record<string, unknown>)[
  "bulkOperation"
] as {
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};
const updateOperation = (id: string, data: Record<string, unknown>) =>
  bulkOp.update({ where: { id }, data });

export const bulkCreateInvoicesTask = task({
  id: "bulk-create-invoices",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkCreateInvoicesPayload) => {
    const { operationId, items, dueDate, academyId } = payload;
    const issueDateValue = new Date();
    const dueDateValue = new Date(dueDate);

    await updateOperation(operationId, {
      status: "PROCESSING",
      startedAt: new Date(),
    });

    const results: ItemResult[] = [];
    let completedItems = 0;
    let failedItems = 0;
    let skippedItems = 0;

    for (const item of items) {
      try {
        const result = await processStudentInvoice(
          item,
          academyId,
          issueDateValue,
          dueDateValue,
        );

        results.push(result);

        if (result.status === "created") completedItems++;
        else if (result.status === "skipped") skippedItems++;
        else failedItems++;

        await updateOperation(operationId, {
          completedItems,
          failedItems,
          skippedItems,
          results: structuredClone(results),
        });
      } catch (error) {
        failedItems++;
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";

        logger.error(`Failed to process student ${item.studentId}`, {
          error: errorMessage,
        });

        results.push({
          studentId: item.studentId,
          studentName: "Unknown",
          status: "failed",
          error: errorMessage,
        });

        await updateOperation(operationId, {
          completedItems,
          failedItems,
          skippedItems,
          results: structuredClone(results),
        });
      }
    }

    await updateOperation(operationId, {
      status: "COMPLETED",
      completedAt: new Date(),
      completedItems,
      failedItems,
      skippedItems,
      results: structuredClone(results),
    });

    logger.info("Bulk invoice creation completed", {
      operationId,
      completedItems,
      failedItems,
      skippedItems,
    });

    return { completedItems, failedItems, skippedItems };
  },
});

/**
 * Procesa un estudiante: busca sus charges, crea la invoice con líneas, y marca charges como INVOICED.
 * Todo dentro de una transacción para garantizar consistencia.
 */
async function processStudentInvoice(
  item: BulkInvoiceItem,
  academyId: string,
  issueDate: Date,
  dueDate: Date,
): Promise<ItemResult> {
  const student = await prisma.student.findUnique({
    where: { id: item.studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
    },
  });

  if (!student) {
    return {
      studentId: item.studentId,
      studentName: "Unknown",
      status: "failed",
      error: "Estudiante no encontrado",
    };
  }

  const studentName = `${student.firstName} ${student.lastName}`;

  const charges = await prisma.charge.findMany({
    where: {
      id: { in: item.chargeIds },
      status: ChargeStatus.PENDING,
    },
    include: { fee: true },
  });

  if (charges.length === 0) {
    return {
      studentId: student.id,
      studentName,
      status: "skipped",
      error: "No hay charges pendientes disponibles",
    };
  }

  const invalidCharges = charges.filter((c) => c.studentId !== student.id);
  if (invalidCharges.length > 0) {
    return {
      studentId: student.id,
      studentName,
      status: "failed",
      error: `Charges no pertenecen al estudiante: ${invalidCharges.map((c) => c.id).join(", ")}`,
    };
  }

  const lines = charges.map(
    (charge): LineDataToCreate => ({
      type: InvoiceLineType.CHARGE,
      chargeId: charge.id,
      description: charge.fee.description,
      originalAmount: charge.amount,
      discountType: null,
      discountValue: null,
      discountReason: null,
      finalAmount: charge.amount,
      isActive: true,
    }),
  );

  const subtotal = lines.reduce((sum, l) => sum + l.originalAmount, 0);
  const total = lines.reduce((sum, l) => sum + l.finalAmount, 0);

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        studentId: student.id,
        academyId,
        recipientName: studentName,
        recipientEmail: student.email,
        recipientPhone: student.phoneNumber,
        issueDate,
        dueDate,
        status: InvoiceStatus.ISSUED,
        subtotal,
        totalDiscount: 0,
        total,
        paidAmount: 0,
        balance: total,
        lines: { create: lines },
      },
    });

    await tx.charge.updateMany({
      where: { id: { in: item.chargeIds } },
      data: { status: ChargeStatus.INVOICED },
    });

    return created;
  });

  return {
    studentId: student.id,
    studentName,
    status: "created",
    invoiceId: invoice.id,
  };
}
