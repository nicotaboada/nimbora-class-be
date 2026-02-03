import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddPaymentInput } from "./dto/add-payment.input";
import { VoidPaymentInput } from "./dto/void-payment.input";
import { Payment } from "./entities/payment.entity";
import { Invoice } from "../invoices/entities/invoice.entity";
import {
  PaymentStatus,
  PaymentType,
  InvoiceStatus,
  CreditStatus,
  Prisma,
} from "@prisma/client";

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Agrega un pago a una factura.
   * Recalcula automáticamente los totales y el status de la factura.
   */
  async addPayment(input: AddPaymentInput): Promise<Invoice> {
    const { invoiceId, amount, method, paidAt, reference } = input;

    // Validar que la factura existe y no está anulada
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se puede agregar pagos a una factura anulada",
      );
    }

    // Calcular balance antes del pago
    const balanceBefore = invoice.total - invoice.paidAmount;

    // Crear payment y recalcular en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          type: PaymentType.PAYMENT,
          amount,
          method,
          status: PaymentStatus.APPROVED,
          paidAt,
          reference,
        },
      });

      // Detectar overpay y crear crédito si aplica
      if (amount > balanceBefore && balanceBefore > 0 && invoice.studentId) {
        const overpay = amount - balanceBefore;

        await tx.studentCredit.create({
          data: {
            studentId: invoice.studentId,
            amount: overpay,
            availableAmount: overpay,
            status: CreditStatus.AVAILABLE,
            sourcePaymentId: payment.id,
            sourceInvoiceId: invoice.id,
          },
        });
      }

      await this.recalculateInvoiceFinancials(tx, invoiceId);

      return tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { lines: true },
      });
    });

    if (!result) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    return this.mapInvoiceToEntity(result);
  }

  /**
   * Anula un pago (soft delete).
   * Recalcula automáticamente los totales y el status de la factura.
   */
  async voidPayment(input: VoidPaymentInput): Promise<Invoice> {
    const { paymentId, reason } = input;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
    }

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException(
        `El pago debe estar en estado APPROVED para anularlo (actual: ${payment.status})`,
      );
    }

    if (payment.invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se puede anular pagos de una factura anulada",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Anular el pago
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOID,
          voidReason: reason,
          voidedAt: new Date(),
        },
      });

      // Si el payment generó crédito, anularlo
      const credit = await tx.studentCredit.findFirst({
        where: {
          sourcePaymentId: paymentId,
          status: CreditStatus.AVAILABLE,
        },
      });

      if (credit) {
        await tx.studentCredit.update({
          where: { id: credit.id },
          data: { status: CreditStatus.VOID },
        });
      }

      await this.recalculateInvoiceFinancials(tx, payment.invoiceId);

      return tx.invoice.findUnique({
        where: { id: payment.invoiceId },
        include: { lines: true },
      });
    });

    if (!result) {
      throw new NotFoundException(
        `Factura con ID ${payment.invoiceId} no encontrada`,
      );
    }

    return this.mapInvoiceToEntity(result);
  }

  /**
   * Obtiene un pago por ID.
   */
  async findById(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
    }

    return payment;
  }

  /**
   * Lista los pagos de una factura.
   */
  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: "desc" },
    });
  }

  /**
   * Recalcula los campos financieros de una factura y deriva su status.
   * Se ejecuta dentro de una transacción.
   */
  private async recalculateInvoiceFinancials(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<void> {
    const payments = await tx.payment.findMany({
      where: { invoiceId, status: PaymentStatus.APPROVED },
    });

    const paymentsSum = payments
      .filter((p) => p.type === PaymentType.PAYMENT)
      .reduce((sum, p) => sum + p.amount, 0);

    const refundsSum = payments
      .filter((p) => p.type === PaymentType.REFUND)
      .reduce((sum, p) => sum + p.amount, 0);

    // paidAmount se limita al total (no puede ser mayor que el total de la factura)
    const rawPaidAmount = paymentsSum - refundsSum;

    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    const paidAmount = Math.min(rawPaidAmount, invoice.total);
    const balance = Math.max(0, invoice.total - paidAmount);

    // Derivar status automático
    let status = invoice.status;
    if (invoice.status !== InvoiceStatus.VOID) {
      if (paidAmount === 0) {
        status = InvoiceStatus.ISSUED;
      } else if (balance > 0) {
        status = InvoiceStatus.PARTIALLY_PAID;
      } else {
        status = InvoiceStatus.PAID; // balance = 0
      }
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount, balance, status },
    });
  }

  /**
   * Mapea una invoice de Prisma a entidad GraphQL.
   * (Reutiliza lógica similar a InvoicesService)
   */
  private mapInvoiceToEntity(
    invoice: Prisma.InvoiceGetPayload<{ include: { lines: true } }>,
  ): Invoice {
    const activeLines = [...invoice.lines]
      .filter((l) => l.isActive)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
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
      lines: activeLines.map((line) => ({
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
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}
