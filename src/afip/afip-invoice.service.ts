import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AfipInvoice } from "./entities/afip-invoice.entity";
import {
  generateAfipInvoicePdf,
  type AfipInvoicePdfData,
} from "../email/generate-afip-invoice-pdf";
import { sendInvoiceNotification } from "../email/send-invoice-email";

@Injectable()
export class AfipInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca el registro AfipInvoice de una factura.
   * Solo retorna si está EMITTED y pertenece a la academy.
   */
  async findByInvoiceId(
    invoiceId: string,
    academyId: string,
  ): Promise<AfipInvoice | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, academyId },
      select: { id: true },
    });

    if (!invoice) return null;

    const afipInvoice = await this.prisma.afipInvoice.findUnique({
      where: { invoiceId },
    });

    if (!afipInvoice || afipInvoice.status !== "EMITTED") return null;

    return {
      id: afipInvoice.id,
      invoiceId: afipInvoice.invoiceId,
      status: afipInvoice.status,
      cae: afipInvoice.cae ?? undefined,
      caeVto: afipInvoice.caeVto ?? undefined,
      cbteNro: afipInvoice.cbteNro ?? undefined,
      cbteTipo: afipInvoice.cbteTipo,
      ptoVta: afipInvoice.ptoVta,
      cbteFch: afipInvoice.cbteFch,
      recipientName: afipInvoice.recipientName,
      docType: afipInvoice.docType,
      docNumber: afipInvoice.docNumber ?? undefined,
      taxCondition: afipInvoice.taxCondition,
    };
  }

  /**
   * Genera el PDF de factura AFIP y lo retorna como string base64.
   */
  async generatePdf(invoiceId: string, academyId: string): Promise<string> {
    // Cargar factura con líneas
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, academyId },
      include: { lines: true },
    });

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    // Cargar datos AFIP
    const afipInvoice = await this.prisma.afipInvoice.findUnique({
      where: { invoiceId },
    });

    if (!afipInvoice || afipInvoice.status !== "EMITTED" || !afipInvoice.cae) {
      throw new BadRequestException(
        "La factura no fue fiscalizada en AFIP o la emisión no fue exitosa",
      );
    }

    // Cargar settings de la academy
    const settings = await this.prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!settings) {
      throw new BadRequestException(
        "La academia no tiene configuración de AFIP",
      );
    }

    const pdfData: AfipInvoicePdfData = {
      emisor: {
        razonSocial: settings.razonSocial ?? "",
        cuit: settings.cuit,
        condicionIva: settings.condicionIva ?? "",
        domicilioFiscal: settings.domicilioFiscal ?? "",
        taxStatus: settings.taxStatus,
      },
      cbteTipo: afipInvoice.cbteTipo,
      ptoVta: afipInvoice.ptoVta,
      cbteNro: afipInvoice.cbteNro,
      cbteFch: afipInvoice.cbteFch,
      recipientName: afipInvoice.recipientName,
      docType: afipInvoice.docType,
      docNumber: afipInvoice.docNumber,
      taxCondition: afipInvoice.taxCondition,
      recipientAddress: invoice.recipientAddress,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        originalAmount: l.originalAmount,
        finalAmount: l.finalAmount,
        discountType: l.discountType,
        discountValue: l.discountValue,
        isActive: l.isActive,
      })),
      subtotal: invoice.subtotal,
      totalDiscount: invoice.totalDiscount,
      total: invoice.total,
      publicNotes: invoice.publicNotes,
      cae: afipInvoice.cae,
      caeVto: afipInvoice.caeVto,
    };

    const buffer = await generateAfipInvoicePdf(pdfData);
    return buffer.toString("base64");
  }

  /**
   * Genera el PDF AFIP y lo envía por email al destinatario de la factura.
   */
  async sendByEmail(invoiceId: string, academyId: string): Promise<boolean> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, academyId },
      include: { lines: true },
    });

    if (!invoice) {
      throw new NotFoundException("Factura no encontrada");
    }

    if (!invoice.recipientEmail) {
      throw new BadRequestException(
        "La factura no tiene email de destinatario",
      );
    }

    // Generate the AFIP PDF buffer (reuse generatePdf logic)
    const base64 = await this.generatePdf(invoiceId, academyId);
    const pdfBuffer = Buffer.from(base64, "base64");

    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
      select: { name: true },
    });

    await sendInvoiceNotification({
      recipientEmail: invoice.recipientEmail,
      recipientName: invoice.recipientName,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      academyName: academy?.name ?? "Academia",
      pdfBuffer,
    });

    return true;
  }

  /**
   * Envía facturas AFIP por email en bulk. Ignora las que no tienen email o fallaron.
   * Retorna la cantidad de emails enviados exitosamente.
   */
  async bulkSendByEmail(
    invoiceIds: string[],
    academyId: string,
  ): Promise<number> {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
      select: { name: true },
    });
    const academyName = academy?.name ?? "Academia";

    let sent = 0;
    for (const invoiceId of invoiceIds) {
      try {
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: invoiceId, academyId },
          select: {
            recipientEmail: true,
            recipientName: true,
            invoiceNumber: true,
            total: true,
            issueDate: true,
            dueDate: true,
          },
        });

        if (!invoice?.recipientEmail) continue;

        const base64 = await this.generatePdf(invoiceId, academyId);
        const pdfBuffer = Buffer.from(base64, "base64");

        await sendInvoiceNotification({
          recipientEmail: invoice.recipientEmail,
          recipientName: invoice.recipientName,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          academyName,
          pdfBuffer,
        });
        sent++;
      } catch (error) {
        console.error(
          `Failed to send AFIP email for invoice ${invoiceId}:`,
          error,
        );
      }
    }

    return sent;
  }
}
