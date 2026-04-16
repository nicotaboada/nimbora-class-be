import { task, logger } from "@trigger.dev/sdk";
import {
  PrismaClient,
  ChargeStatus,
  InvoiceStatus,
  InvoiceLineType,
} from "@prisma/client";
import { LineDataToCreate } from "../invoices/types/invoice.types";
import { sendInvoiceNotification } from "../email/send-invoice-email";
import { generateInvoicePdf } from "../email/generate-invoice-pdf";
import {
  mapGuardiansToRecipients,
  NotificationRecipient,
} from "../invoices/utils/resolve-notification-recipients.util";
import {
  BulkFamilyInvoiceItem,
  BulkFamilyInvoiceResult,
} from "../bulk-operations/types/bulk-invoice.types";
import { runBulkOperation } from "./utils/run-bulk-operation.util";

const prisma = new PrismaClient();

interface BulkCreateFamilyInvoicesPayload {
  operationId: string;
  items: BulkFamilyInvoiceItem[];
  dueDate: string;
  academyId: string;
  notify: boolean;
}

export const bulkCreateFamilyInvoicesTask = task({
  id: "bulk-create-family-invoices",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkCreateFamilyInvoicesPayload) => {
    const { operationId, items, dueDate, academyId, notify } = payload;
    const issueDate = new Date();
    const dueDateValue = new Date(dueDate);

    const academyName = notify ? await loadAcademyName(academyId) : "Academia";

    return runBulkOperation<BulkFamilyInvoiceItem, BulkFamilyInvoiceResult>({
      prisma,
      operationId,
      items,
      logLabel: "bulk-create-family-invoices",
      processItem: (item) =>
        processFamilyInvoice({
          item,
          academyId,
          issueDate,
          dueDate: dueDateValue,
          notify,
          academyName,
        }),
      buildFailureResult: (item, error) => ({
        familyId: item.familyId,
        familyName: "Unknown",
        status: "failed",
        error,
      }),
    });
  },
});

async function loadAcademyName(academyId: string): Promise<string> {
  const academy = await prisma.academy.findUnique({
    where: { id: academyId },
    select: { name: true },
  });
  return academy?.name ?? "Academia";
}

interface ProcessArgs {
  item: BulkFamilyInvoiceItem;
  academyId: string;
  issueDate: Date;
  dueDate: Date;
  notify: boolean;
  academyName: string;
}

/**
 * Procesa una familia: agrupa los charges PENDING de los estudiantes incluidos
 * en una única factura familiar y los marca como INVOICED dentro de una transacción.
 */
async function processFamilyInvoice(
  args: ProcessArgs,
): Promise<BulkFamilyInvoiceResult> {
  const { item, academyId, issueDate, dueDate, notify, academyName } = args;

  const family = await prisma.family.findUnique({
    where: { id: item.familyId },
    include: {
      guardians: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          address: true,
          emailNotifications: true,
          isResponsibleForBilling: true,
        },
      },
    },
  });

  if (!family) {
    return {
      familyId: item.familyId,
      familyName: "Unknown",
      status: "failed",
      error: "Familia no encontrada",
    };
  }

  const allCharges = await prisma.charge.findMany({
    where: {
      studentId: { in: item.students.map((s) => s.studentId) },
      id: { in: item.students.flatMap((s) => s.chargeIds) },
      status: ChargeStatus.PENDING,
    },
    include: {
      fee: true,
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (allCharges.length === 0) {
    return {
      familyId: family.id,
      familyName: family.name,
      status: "skipped",
      error: "No hay charges pendientes disponibles",
    };
  }

  const lines = allCharges.map(
    (charge): LineDataToCreate => ({
      type: InvoiceLineType.CHARGE,
      chargeId: charge.id,
      description: charge.periodMonth
        ? `${charge.fee.description} — Cuota ${charge.periodMonth} (${charge.student.firstName} ${charge.student.lastName})`
        : `${charge.fee.description} (${charge.student.firstName} ${charge.student.lastName})`,
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

  // Recipient: guardián marcado como responsable de billing > primer guardián
  const primaryGuardian =
    family.guardians.find((g) => g.isResponsibleForBilling) ??
    family.guardians[0];

  const recipientName = primaryGuardian
    ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}`
    : family.name;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        familyId: family.id,
        academyId,
        recipientName,
        recipientEmail: primaryGuardian?.email ?? null,
        recipientPhone: primaryGuardian?.phoneNumber ?? null,
        recipientAddress: primaryGuardian?.address ?? null,
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
      where: { id: { in: allCharges.map((c) => c.id) } },
      data: { status: ChargeStatus.INVOICED },
    });
    return created;
  });

  if (notify) {
    await sendFamilyInvoiceNotifications({
      recipients: mapGuardiansToRecipients(family.guardians),
      familyId: family.id,
      invoiceNumber: invoice.invoiceNumber,
      recipientName,
      recipientEmail: primaryGuardian?.email ?? null,
      recipientPhone: primaryGuardian?.phoneNumber ?? null,
      issueDate,
      dueDate,
      subtotal,
      total,
      lines,
      academyName,
    });
  }

  return {
    familyId: family.id,
    familyName: family.name,
    status: "created",
    invoiceId: invoice.id,
    studentCount: new Set(allCharges.map((c) => c.studentId)).size,
    totalLines: lines.length,
  };
}

interface NotifyArgs {
  recipients: NotificationRecipient[];
  familyId: string;
  invoiceNumber: number;
  recipientName: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  total: number;
  lines: LineDataToCreate[];
  academyName: string;
}

async function sendFamilyInvoiceNotifications(args: NotifyArgs): Promise<void> {
  if (args.recipients.length === 0) return;

  try {
    const pdfBuffer = generateInvoicePdf({
      invoiceNumber: args.invoiceNumber,
      recipientName: args.recipientName,
      recipientEmail: args.recipientEmail,
      recipientPhone: args.recipientPhone,
      issueDate: args.issueDate,
      dueDate: args.dueDate,
      subtotal: args.subtotal,
      totalDiscount: 0,
      total: args.total,
      lines: args.lines.map((l) => ({
        description: l.description,
        originalAmount: l.originalAmount,
        finalAmount: l.finalAmount,
        discountType: l.discountType,
        discountValue: l.discountValue,
        isActive: l.isActive,
      })),
    });

    for (const recipient of args.recipients) {
      try {
        await sendInvoiceNotification({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          invoiceNumber: args.invoiceNumber,
          total: args.total,
          issueDate: args.issueDate,
          dueDate: args.dueDate,
          academyName: args.academyName,
          pdfBuffer,
        });
      } catch (error) {
        logger.warn(
          `Failed to send invoice notification to ${recipient.email}`,
          { error },
        );
      }
    }
  } catch (error) {
    logger.warn(
      `Failed to process invoice notifications for family ${args.familyId}`,
      { error },
    );
  }
}
