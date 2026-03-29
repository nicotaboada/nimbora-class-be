import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { CreateInvoiceInput } from "./dto/create-invoice.input";
import { CreateInvoiceLineInput } from "./dto/create-invoice-line.input";
import { AddInvoiceLineInput } from "./dto/add-invoice-line.input";
import { UpdateInvoiceLineInput } from "./dto/update-invoice-line.input";
import { InvoicesFilterInput } from "./dto/findAll-filter.input";
import { Invoice } from "./entities/invoice.entity";
import { StudentInvoiceOverview } from "./entities/student-invoice-overview.entity";
import {
  calculateFinalAmount,
  calculateInvoiceTotals,
  validateDiscount,
} from "./utils/invoice-calculator";
import { ChargeStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { InvoiceLineType } from "./enums/invoice-line-type.enum";
import { DiscountType } from "./enums/discount-type.enum";
import { LineDataToCreate } from "./types/invoice.types";
import {
  assertFound,
  assertOwnership,
} from "../common/utils/tenant-validation";
import { sendInvoiceNotification } from "../email/send-invoice-email";
import { generateInvoicePdf } from "../email/generate-invoice-pdf";
import { mapInvoiceToEntity } from "./utils/invoice-mapper.util";

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
  ) {}

  /**
   * Crea una nueva factura con sus líneas.
   */
  async createInvoice(
    input: CreateInvoiceInput,
    academyId: string,
  ): Promise<Invoice> {
    const {
      studentId,
      recipientName,
      recipientEmail,
      recipientPhone,
      recipientAddress,
      issueDate,
      dueDate,
      publicNotes,
      privateNotes,
      lines: lineInputs,
    } = input;
    // T11 - Validar que haya al menos una línea
    if (!lineInputs || lineInputs.length === 0) {
      throw new BadRequestException("Invoice must have at least 1 line");
    }

    // Ownership: validar que student pertenece a la academy
    let studentAcademyId = academyId;
    if (studentId) {
      const student = await this.studentsService.findOne(studentId, academyId);
      studentAcademyId = student.academyId;
    }

    const chargeLineInputs = lineInputs.filter(
      (l) => l.type === InvoiceLineType.CHARGE,
    );
    const chargeIds = chargeLineInputs
      .map((l) => l.chargeId)
      .filter((id): id is string => !!id);
    // T12 - Validar que no haya chargeIds duplicados
    const uniqueChargeIds = new Set(chargeIds);
    if (uniqueChargeIds.size !== chargeIds.length) {
      throw new BadRequestException("Duplicate chargeId in lines");
    }
    // Preparar mapa de charges y validar FUERA de la transacción
    const chargesMap = new Map<
      string,
      { amount: number; feeDescription: string; periodMonth: string | null }
    >();
    if (chargeIds.length > 0) {
      const charges = await this.prisma.charge.findMany({
        where: { id: { in: chargeIds }, status: ChargeStatus.PENDING },
        include: { fee: true },
      });
      if (charges.length !== chargeIds.length) {
        const foundIds = new Set(charges.map((c) => c.id));
        const missingIds = chargeIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Cargos no encontrados o no disponibles: ${missingIds.join(", ")}`,
        );
      }
      // T14 - Integrity: validar que charges pertenezcan al student
      if (studentId) {
        const invalidCharges = charges.filter((c) => c.studentId !== studentId);
        if (invalidCharges.length > 0) {
          throw new BadRequestException(
            `Charge does not belong to student: ${invalidCharges.map((c) => c.id).join(", ")}`,
          );
        }
      }
      // Construir mapa para usar en la transacción
      for (const c of charges) {
        chargesMap.set(c.id, {
          amount: c.amount,
          feeDescription: c.periodMonth
            ? `${c.fee.description} — Cuota ${c.periodMonth}`
            : c.fee.description,
          periodMonth: c.periodMonth,
        });
      }
    }

    // Preparar líneas y validar FUERA de la transacción
    const linesToCreate = lineInputs.map((lineInput) => {
      if (lineInput.type === InvoiceLineType.CHARGE && lineInput.chargeId) {
        const chargeData = chargesMap.get(lineInput.chargeId);
        if (!chargeData) {
          throw new BadRequestException(
            `Cargo ${lineInput.chargeId} no encontrado`,
          );
        }
        return this.buildLineData(lineInput, chargeData);
      } else {
        // Validar campos requeridos para líneas MANUAL
        if (
          lineInput.originalAmount === undefined ||
          lineInput.originalAmount === null
        ) {
          throw new BadRequestException(
            "originalAmount es requerido para líneas MANUAL",
          );
        }
        if (!lineInput.description) {
          throw new BadRequestException(
            "description es requerido para líneas MANUAL",
          );
        }
        return this.buildLineData(lineInput);
      }
    });
    const totals = calculateInvoiceTotals(linesToCreate);

    // Transacción optimizada: solo writes, sin validaciones ni queries de lectura
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          studentId,
          academyId: studentAcademyId,
          recipientName,
          recipientEmail,
          recipientPhone,
          recipientAddress,
          issueDate,
          dueDate,
          publicNotes,
          privateNotes,
          status: InvoiceStatus.ISSUED,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          total: totals.total,
          paidAmount: 0,
          balance: totals.total,
          lines: {
            create: linesToCreate,
          },
        },
        include: { lines: true, payments: true },
      });
      if (chargeIds.length > 0) {
        await tx.charge.updateMany({
          where: { id: { in: chargeIds } },
          data: { status: ChargeStatus.INVOICED },
        });
      }
      return invoice;
    });

    if (input.notify && result.recipientEmail) {
      try {
        const academy = await this.prisma.academy.findUnique({
          where: { id: academyId },
          select: { name: true },
        });
        const pdfBuffer = generateInvoicePdf({
          invoiceNumber: result.invoiceNumber,
          recipientName: result.recipientName,
          recipientEmail: result.recipientEmail,
          recipientPhone: result.recipientPhone,
          recipientAddress: result.recipientAddress,
          issueDate: result.issueDate,
          dueDate: result.dueDate,
          subtotal: result.subtotal,
          totalDiscount: result.totalDiscount,
          total: result.total,
          publicNotes: result.publicNotes,
          lines: result.lines,
        });
        await sendInvoiceNotification({
          recipientEmail: result.recipientEmail,
          recipientName: result.recipientName,
          invoiceNumber: result.invoiceNumber,
          total: result.total,
          issueDate: result.issueDate,
          dueDate: result.dueDate,
          academyName: academy?.name ?? "Academia",
          pdfBuffer,
        });
      } catch (error) {
        console.error("Failed to send invoice notification:", error);
      }
    }

    return mapInvoiceToEntity(result);
  }

  /**
   * Agrega una línea a una factura existente.
   */
  async addInvoiceLine(
    input: AddInvoiceLineInput,
    academyId: string,
  ): Promise<Invoice> {
    const { invoiceId, line: lineInput } = input;
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, payments: true },
    });

    // Ownership: validar que invoice pertenece a la academy
    assertOwnership(invoice, academyId, "Invoice");

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se pueden agregar líneas a una factura anulada",
      );
    }
    // Validar que no tenga payments APPROVED
    const hasApprovedPayments = invoice.payments.some(
      (p) => p.status === "APPROVED",
    );
    if (hasApprovedPayments) {
      throw new BadRequestException(
        "No se puede modificar una factura con pagos registrados",
      );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      let lineData: LineDataToCreate;
      if (lineInput.type === InvoiceLineType.CHARGE && lineInput.chargeId) {
        const charge = await tx.charge.findUnique({
          where: { id: lineInput.chargeId },
          include: { fee: true },
        });
        assertFound(charge, "Charge");

        if (charge.status !== ChargeStatus.PENDING) {
          throw new BadRequestException(
            `El cargo ${lineInput.chargeId} no está disponible (status: ${charge.status})`,
          );
        }
        // Integrity: validar que el charge pertenezca al student de la factura
        if (invoice.studentId && charge.studentId !== invoice.studentId) {
          throw new BadRequestException(
            `Charge does not belong to student: ${charge.id}`,
          );
        }
        lineData = this.buildLineData(lineInput, {
          amount: charge.amount,
          feeDescription: charge.periodMonth
            ? `${charge.fee.description} — Cuota ${charge.periodMonth}`
            : charge.fee.description,
        });
        await tx.charge.update({
          where: { id: lineInput.chargeId },
          data: { status: ChargeStatus.INVOICED },
        });
      } else {
        // Validar campos requeridos para líneas MANUAL
        if (
          lineInput.originalAmount === undefined ||
          lineInput.originalAmount === null
        ) {
          throw new BadRequestException(
            "originalAmount es requerido para líneas MANUAL",
          );
        }
        if (!lineInput.description) {
          throw new BadRequestException(
            "description es requerido para líneas MANUAL",
          );
        }
        lineData = this.buildLineData(lineInput);
      }
      await tx.invoiceLine.create({
        data: {
          invoiceId,
          ...lineData,
        },
      });
      const updatedLines = await tx.invoiceLine.findMany({
        where: { invoiceId },
      });
      const totals = calculateInvoiceTotals(updatedLines);
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          total: totals.total,
          balance: Math.max(0, totals.total - invoice.paidAmount),
        },
        include: { lines: true, payments: true },
      });
      return updatedInvoice;
    });
    return mapInvoiceToEntity(result);
  }

  /**
   * Actualiza el descuento de una línea.
   */
  async updateInvoiceLine(
    input: UpdateInvoiceLineInput,
    academyId: string,
  ): Promise<Invoice> {
    const { lineId, discountType, discountValue, discountReason } = input;
    const line = await this.prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: { include: { payments: true } } },
    });
    if (!line) {
      throw new NotFoundException(`Línea con ID ${lineId} no encontrada`);
    }

    // Ownership: validar que invoice pertenece a la academy
    assertOwnership(line.invoice, academyId, "Invoice");

    if (!line.isActive) {
      throw new BadRequestException("No se puede editar una línea inactiva");
    }
    if (line.invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException("No se puede editar una factura anulada");
    }
    // Validar que no tenga payments APPROVED
    const hasApprovedPayments = line.invoice.payments.some(
      (p) => p.status === "APPROVED",
    );
    if (hasApprovedPayments) {
      throw new BadRequestException(
        "No se puede modificar una factura con pagos registrados",
      );
    }
    // Validar descuento
    const validation = validateDiscount(
      line.originalAmount,
      discountType,
      discountValue,
    );
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const newFinalAmount = calculateFinalAmount(
        line.originalAmount,
        discountType,
        discountValue,
      );
      await tx.invoiceLine.update({
        where: { id: lineId },
        data: {
          discountType,
          discountValue,
          discountReason,
          finalAmount: newFinalAmount,
        },
      });
      const updatedLines = await tx.invoiceLine.findMany({
        where: { invoiceId: line.invoiceId },
      });
      const totals = calculateInvoiceTotals(updatedLines);
      const updatedInvoice = await tx.invoice.update({
        where: { id: line.invoiceId },
        data: {
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          total: totals.total,
          balance: Math.max(0, totals.total - line.invoice.paidAmount),
        },
        include: { lines: true, payments: true },
      });
      return updatedInvoice;
    });
    return mapInvoiceToEntity(result);
  }

  /**
   * Remueve una línea de una factura (isActive = false).
   */
  async removeInvoiceLine(lineId: string, academyId: string): Promise<Invoice> {
    const line = await this.prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: { include: { payments: true } } },
    });
    if (!line) {
      throw new NotFoundException(`Línea con ID ${lineId} no encontrada`);
    }

    // Ownership: validar que invoice pertenece a la academy
    assertOwnership(line.invoice, academyId, "Invoice");

    if (!line.isActive) {
      throw new BadRequestException("La línea ya está inactiva");
    }
    if (line.invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se puede modificar una factura anulada",
      );
    }
    // Validar que no tenga payments APPROVED
    const hasApprovedPayments = line.invoice.payments.some(
      (p) => p.status === "APPROVED",
    );
    if (hasApprovedPayments) {
      throw new BadRequestException(
        "No se puede modificar una factura con pagos registrados",
      );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceLine.update({
        where: { id: lineId },
        data: { isActive: false },
      });
      if (line.chargeId) {
        await tx.charge.update({
          where: { id: line.chargeId },
          data: { status: ChargeStatus.PENDING },
        });
      }
      const updatedLines = await tx.invoiceLine.findMany({
        where: { invoiceId: line.invoiceId },
      });
      const totals = calculateInvoiceTotals(updatedLines);
      const updatedInvoice = await tx.invoice.update({
        where: { id: line.invoiceId },
        data: {
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          total: totals.total,
          balance: Math.max(0, totals.total - line.invoice.paidAmount),
        },
        include: { lines: true, payments: true },
      });
      return updatedInvoice;
    });
    return mapInvoiceToEntity(result);
  }

  /**
   * Anula una factura (soft delete).
   * También anula todos los payments y créditos asociados.
   */
  async voidInvoice(invoiceId: string, academyId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, payments: true },
    });

    // Ownership: validar que invoice pertenece a la academy
    assertOwnership(invoice, academyId, "Invoice");

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException("La factura ya está anulada");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Anular payments APPROVED asociados
      const approvedPayments = invoice.payments.filter(
        (p) => p.status === "APPROVED",
      );
      if (approvedPayments.length > 0) {
        await tx.payment.updateMany({
          where: {
            invoiceId,
            status: "APPROVED",
          },
          data: {
            status: "VOID",
            voidReason: "Invoice anulada",
            voidedAt: new Date(),
          },
        });

        // 2. Anular créditos generados por esos payments
        const paymentIds = approvedPayments.map((p) => p.id);
        await tx.studentCredit.updateMany({
          where: {
            sourcePaymentId: { in: paymentIds },
            status: "AVAILABLE",
          },
          data: {
            status: "VOID",
          },
        });
      }

      // 3. Desactivar líneas
      await tx.invoiceLine.updateMany({
        where: { invoiceId, isActive: true },
        data: { isActive: false },
      });

      // 4. Liberar charges
      const chargeIds = invoice.lines
        .filter((l) => l.isActive && l.chargeId)
        .map((l) => l.chargeId);
      if (chargeIds.length > 0) {
        await tx.charge.updateMany({
          where: { id: { in: chargeIds } },
          data: { status: ChargeStatus.PENDING },
        });
      }

      // 5. Actualizar invoice (VOID + resetear totales de pago)
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.VOID,
          paidAmount: 0,
          balance: 0,
        },
        include: { lines: true, payments: true },
      });
      return updatedInvoice;
    });
    return mapInvoiceToEntity(result);
  }

  /**
   * Obtiene una factura por ID.
   */
  async findById(invoiceId: string, academyId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, payments: true },
    });

    // Ownership: validar que invoice pertenece a la academy
    assertOwnership(invoice, academyId, "Invoice");

    return mapInvoiceToEntity(invoice);
  }

  /**
   * Lista facturas con filtros opcionales y paginación.
   */
  async findAll(academyId: string, filters?: InvoicesFilterInput) {
    const pageInput: number = filters?.page ?? 1;
    const limitInput: number = filters?.limit ?? 10;
    const page: number = Math.max(1, pageInput);
    const limit: number = Math.min(Math.max(1, limitInput), 100);
    const skip: number = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      academyId, // Filtrar por academy
    };

    if (filters?.studentId) {
      where.studentId = filters.studentId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.recipientName = { contains: filters.search, mode: "insensitive" };
    }
    if (filters?.issueDateFrom || filters?.issueDateTo) {
      where.issueDate = {
        ...(filters.issueDateFrom && { gte: filters.issueDateFrom }),
        ...(filters.issueDateTo && { lte: filters.issueDateTo }),
      };
    }
    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { lines: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data: invoices.map((inv) => mapInvoiceToEntity(inv)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Overview financiero de un alumno: facturas impagas/pagadas recientes y totales.
   */
  async getStudentOverview(
    studentId: string,
    academyId: string,
  ): Promise<StudentInvoiceOverview> {
    await this.studentsService.findOne(studentId, academyId);
    const [unpaidInvoices, paidInvoices, unpaidAggregate, paidAggregate] =
      await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            studentId,
            academyId,
            status: {
              in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
            },
          },
          orderBy: { dueDate: "asc" },
          take: 3,
          include: { lines: true, payments: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            studentId,
            academyId,
            status: InvoiceStatus.PAID,
          },
          orderBy: { dueDate: "desc" },
          take: 3,
          include: { lines: true, payments: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            studentId,
            academyId,
            status: {
              in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID],
            },
          },
          _sum: { balance: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            studentId,
            academyId,
            status: InvoiceStatus.PAID,
          },
          _sum: { paidAmount: true },
        }),
      ]);
    return {
      unpaidInvoices: unpaidInvoices.map((inv) => mapInvoiceToEntity(inv)),
      paidInvoices: paidInvoices.map((inv) => mapInvoiceToEntity(inv)),
      totalUnpaidAmount: unpaidAggregate._sum.balance ?? 0,
      totalPaidAmount: paidAggregate._sum.paidAmount ?? 0,
    };
  }

  /**
   * Construye los datos de una línea de factura.
   */
  private buildLineData(
    lineInput: CreateInvoiceLineInput,
    chargeData?: { amount: number; feeDescription: string },
  ): LineDataToCreate {
    // Determinar valores según tipo de línea
    let originalAmount: number;
    let description: string;
    let chargeId: string | null;

    if (lineInput.type === InvoiceLineType.CHARGE && chargeData) {
      originalAmount = chargeData.amount;
      description = chargeData.feeDescription;
      chargeId = lineInput.chargeId ?? null;
    } else {
      // Para líneas MANUAL, estos campos ya fueron validados antes de llamar
      originalAmount = lineInput.originalAmount ?? 0;
      description = lineInput.description ?? "";
      chargeId = null;
    }

    const discountValue =
      lineInput.discountType === DiscountType.FIXED_AMOUNT
        ? lineInput.discountValueFixed
        : lineInput.discountValue;

    // Validar descuento
    const validation = validateDiscount(
      originalAmount,
      lineInput.discountType,
      discountValue,
    );
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    const finalAmount = calculateFinalAmount(
      originalAmount,
      lineInput.discountType,
      discountValue,
    );

    return {
      type: lineInput.type,
      chargeId,
      description,
      originalAmount,
      discountType: lineInput.discountType ?? null,
      discountValue: discountValue ?? null,
      discountReason: lineInput.discountReason ?? null,
      finalAmount,
      isActive: true,
    };
  }
}
