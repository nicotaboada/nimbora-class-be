import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceInput } from "./dto/create-invoice.input";
import { CreateInvoiceLineInput } from "./dto/create-invoice-line.input";
import { AddInvoiceLineInput } from "./dto/add-invoice-line.input";
import { UpdateInvoiceLineInput } from "./dto/update-invoice-line.input";
import { InvoicesFilterInput } from "./dto/findAll-filter.input";
import { Invoice } from "./entities/invoice.entity";
import { InvoiceLine } from "./entities/invoice-line.entity";
import {
  calculateFinalAmount,
  calculateInvoiceTotals,
  validateDiscount,
} from "./utils/invoice-calculator";
import { ChargeStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { InvoiceLineType } from "./enums/invoice-line-type.enum";
import { DiscountType } from "./enums/discount-type.enum";
import { LineDataToCreate, InvoiceWithLines } from "./types/invoice.types";

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva factura con sus líneas.
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
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
    if (studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student) {
        throw new NotFoundException(
          `Estudiante con ID ${studentId} no encontrado`,
        );
      }
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
      // T14 - Validar que charges pertenezcan al student (si hay studentId)
      if (studentId) {
        const invalidCharges = charges.filter((c) => c.studentId !== studentId);
        if (invalidCharges.length > 0) {
          throw new BadRequestException(
            `Charge does not belong to student: ${invalidCharges.map((c) => c.id).join(", ")}`,
          );
        }
      }
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const chargesMap = new Map<
        string,
        { amount: number; feeDescription: string }
      >();
      if (chargeIds.length > 0) {
        const charges = await tx.charge.findMany({
          where: { id: { in: chargeIds } },
          include: { fee: true },
        });
        for (const c of charges) {
          chargesMap.set(c.id, {
            amount: c.amount,
            feeDescription: c.fee.description,
          });
        }
      }
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
      const invoice = await tx.invoice.create({
        data: {
          studentId,
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
          lines: {
            create: linesToCreate,
          },
        },
        include: { lines: true },
      });
      if (chargeIds.length > 0) {
        await tx.charge.updateMany({
          where: { id: { in: chargeIds } },
          data: { status: ChargeStatus.INVOICED },
        });
      }
      return invoice;
    });
    return this.mapInvoiceToEntity(result);
  }

  /**
   * Agrega una línea a una factura existente.
   */
  async addInvoiceLine(input: AddInvoiceLineInput): Promise<Invoice> {
    const { invoiceId, line: lineInput } = input;
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se pueden agregar líneas a una factura anulada",
      );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      let lineData: LineDataToCreate;
      if (lineInput.type === InvoiceLineType.CHARGE && lineInput.chargeId) {
        const charge = await tx.charge.findUnique({
          where: { id: lineInput.chargeId },
          include: { fee: true },
        });
        if (!charge) {
          throw new NotFoundException(
            `Cargo ${lineInput.chargeId} no encontrado`,
          );
        }
        if (charge.status !== ChargeStatus.PENDING) {
          throw new BadRequestException(
            `El cargo ${lineInput.chargeId} no está disponible (status: ${charge.status})`,
          );
        }
        // Validar que el charge pertenezca al student de la factura
        if (invoice.studentId && charge.studentId !== invoice.studentId) {
          throw new BadRequestException(
            `Charge does not belong to student: ${charge.id}`,
          );
        }
        lineData = this.buildLineData(lineInput, {
          amount: charge.amount,
          feeDescription: charge.fee.description,
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
        },
        include: { lines: true },
      });
      return updatedInvoice;
    });
    return this.mapInvoiceToEntity(result);
  }

  /**
   * Actualiza el descuento de una línea.
   */
  async updateInvoiceLine(input: UpdateInvoiceLineInput): Promise<Invoice> {
    const { lineId, discountType, discountValue, discountReason } = input;
    const line = await this.prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: true },
    });
    if (!line) {
      throw new NotFoundException(`Línea con ID ${lineId} no encontrada`);
    }
    if (!line.isActive) {
      throw new BadRequestException("No se puede editar una línea inactiva");
    }
    if (line.invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException("No se puede editar una factura anulada");
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
        },
        include: { lines: true },
      });
      return updatedInvoice;
    });
    return this.mapInvoiceToEntity(result);
  }

  /**
   * Remueve una línea de una factura (isActive = false).
   */
  async removeInvoiceLine(lineId: string): Promise<Invoice> {
    const line = await this.prisma.invoiceLine.findUnique({
      where: { id: lineId },
      include: { invoice: true },
    });
    if (!line) {
      throw new NotFoundException(`Línea con ID ${lineId} no encontrada`);
    }
    if (!line.isActive) {
      throw new BadRequestException("La línea ya está inactiva");
    }
    if (line.invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        "No se puede modificar una factura anulada",
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
        },
        include: { lines: true },
      });
      return updatedInvoice;
    });
    return this.mapInvoiceToEntity(result);
  }

  /**
   * Anula una factura (soft delete).
   */
  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException("La factura ya está anulada");
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("No se puede anular una factura pagada");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceLine.updateMany({
        where: { invoiceId, isActive: true },
        data: { isActive: false },
      });
      const chargeIds = invoice.lines
        .filter((l) => l.isActive && l.chargeId)
        .map((l) => l.chargeId);
      if (chargeIds.length > 0) {
        await tx.charge.updateMany({
          where: { id: { in: chargeIds } },
          data: { status: ChargeStatus.PENDING },
        });
      }
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.VOID },
        include: { lines: true },
      });
      return updatedInvoice;
    });
    return this.mapInvoiceToEntity(result);
  }

  /**
   * Obtiene una factura por ID.
   */
  async findById(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }
    return this.mapInvoiceToEntity(invoice);
  }

  /**
   * Lista facturas con filtros opcionales y paginación.
   */
  async findAll(filters?: InvoicesFilterInput) {
    const pageInput: number = filters?.page ?? 1;
    const limitInput: number = filters?.limit ?? 10;
    const page: number = Math.max(1, pageInput);
    const limit: number = Math.min(Math.max(1, limitInput), 100);
    const skip: number = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = {};
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
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data: invoices.map((inv) => this.mapInvoiceToEntity(inv)),
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

  /**
   * Mapea un invoice de Prisma a la entidad GraphQL.
   */
  private mapInvoiceToEntity(invoice: InvoiceWithLines): Invoice {
    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }
    const activeLines = [...invoice.lines]
      .filter((l) => l.isActive)
      // Usamos sort() porque toSorted() no está disponible en ES2021
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
      lines: activeLines.map((line) => this.mapLineToEntity(line)),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Mapea una línea de Prisma a la entidad GraphQL.
   */
  private mapLineToEntity(
    line: InvoiceWithLines["lines"][number],
  ): InvoiceLine {
    if (!line) {
      throw new NotFoundException("Línea no encontrada");
    }
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
}
