import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { Invoice } from "../invoices/entities/invoice.entity";
import { AfipInvoice } from "./entities/afip-invoice.entity";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Extends the Invoice GraphQL type with AFIP fiscal data.
 * Keeps AFIP logic in the AFIP module instead of polluting the Invoice entity.
 */
@Resolver(() => Invoice)
export class InvoiceAfipFieldResolver {
  constructor(private readonly prisma: PrismaService) {}

  @ResolveField("afipInvoice", () => AfipInvoice, {
    nullable: true,
    description:
      "Datos de fiscalización AFIP (null si la factura no fue fiscalizada)",
  })
  async resolveAfipInvoice(
    @Parent() invoice: Invoice,
  ): Promise<AfipInvoice | null> {
    const afip = await this.prisma.afipInvoice.findUnique({
      where: { invoiceId: invoice.id },
    });

    if (!afip || afip.status !== "EMITTED") return null;

    return {
      id: afip.id,
      invoiceId: afip.invoiceId,
      status: afip.status,
      cae: afip.cae ?? undefined,
      caeVto: afip.caeVto ?? undefined,
      cbteNro: afip.cbteNro ?? undefined,
      cbteTipo: afip.cbteTipo,
      ptoVta: afip.ptoVta,
      cbteFch: afip.cbteFch,
      recipientName: afip.recipientName,
      docType: afip.docType,
      docNumber: afip.docNumber ?? undefined,
      taxCondition: afip.taxCondition,
    };
  }
}
