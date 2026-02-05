import { Prisma } from "@prisma/client";
import { Invoice } from "../entities/invoice.entity";
import { InvoiceLine } from "../entities/invoice-line.entity";
import { Payment } from "../../payments/entities/payment.entity";

type PrismaInvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true };
}>;

type PrismaInvoiceWithLinesAndPayments = Prisma.InvoiceGetPayload<{
  include: { lines: true; payments: true };
}>;

/**
 * Maps a Prisma Invoice (with lines) to the Invoice entity.
 * @param invoice The invoice object from Prisma with lines included
 * @returns The mapped Invoice entity
 */
export function mapInvoiceToEntity(
  invoice: PrismaInvoiceWithLines | PrismaInvoiceWithLinesAndPayments,
): Invoice {
  const activeLines = [...invoice.lines]
    .filter((l) => l.isActive)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const result: Invoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    studentId: invoice.studentId ?? undefined,
    recipientName: invoice.recipientName,
    recipientEmail: invoice.recipientEmail ?? undefined,
    recipientPhone: invoice.recipientPhone ?? undefined,
    recipientAddress: invoice.recipientAddress ?? undefined,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    publicNotes: invoice.publicNotes ?? undefined,
    privateNotes: invoice.privateNotes ?? undefined,
    status: invoice.status,
    subtotal: invoice.subtotal,
    totalDiscount: invoice.totalDiscount,
    total: invoice.total,
    paidAmount: invoice.paidAmount,
    balance: invoice.balance,
    lines: activeLines.map((line) => mapInvoiceLineToEntity(line)),
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };

  // Si incluye payments, agregarlos
  if ("payments" in invoice && invoice.payments) {
    result.payments = invoice.payments as Payment[];
  }

  return result;
}

/**
 * Maps a Prisma InvoiceLine to the InvoiceLine entity.
 * @param line The invoice line object from Prisma
 * @returns The mapped InvoiceLine entity
 */
export function mapInvoiceLineToEntity(
  line: Prisma.InvoiceLineGetPayload<object>,
): InvoiceLine {
  return {
    id: line.id,
    invoiceId: line.invoiceId,
    type: line.type,
    chargeId: line.chargeId ?? undefined,
    description: line.description,
    originalAmount: line.originalAmount,
    discountType: line.discountType ?? undefined,
    discountValue: line.discountValue ?? undefined,
    discountReason: line.discountReason ?? undefined,
    finalAmount: line.finalAmount,
    isActive: line.isActive,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
  };
}
