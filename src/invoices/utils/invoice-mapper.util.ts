import {
  Prisma,
  Invoice as PrismaInvoice,
  InvoiceLine as PrismaInvoiceLine,
  Student as PrismaStudent,
  Family as PrismaFamily,
  FamilyGuardian as PrismaGuardian,
  ClassStudent as PrismaClassStudent,
  Class as PrismaClass,
  Payment as PrismaPayment,
} from "@prisma/client";
import { Invoice } from "../entities/invoice.entity";
import { InvoiceLine } from "../entities/invoice-line.entity";
import { mapStudentToEntity } from "../../students/utils/student-mapper.util";
import { mapFamilyToEntity } from "../../families/utils/family-mapper.util";

type MappableFamily = PrismaFamily & {
  students: Array<
    PrismaStudent & {
      classStudents: Array<PrismaClassStudent & { class: PrismaClass }>;
    }
  >;
  guardians: PrismaGuardian[];
};

type MappableInvoice = PrismaInvoice & {
  lines: PrismaInvoiceLine[];
  student?: PrismaStudent | null;
  family?: MappableFamily | null;
  payments?: PrismaPayment[];
};

export function mapInvoiceToEntity(invoice: MappableInvoice): Invoice {
  const activeLines = [...(invoice.lines ?? [])]
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
    student: invoice.student ? mapStudentToEntity(invoice.student) : undefined,
    familyId: invoice.familyId ?? undefined,
    family: invoice.family ? mapFamilyToEntity(invoice.family) : undefined,
  };

  if (invoice.payments && invoice.payments.length > 0) {
    result.payments = invoice.payments;
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
