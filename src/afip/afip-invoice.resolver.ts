import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AfipInvoiceService } from "./afip-invoice.service";
import { AfipInvoice } from "./entities/afip-invoice.entity";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => AfipInvoice)
@UseGuards(SupabaseAuthGuard)
export class AfipInvoiceResolver {
  constructor(private readonly afipInvoiceService: AfipInvoiceService) {}

  /**
   * Obtiene los datos fiscales AFIP de una factura.
   * Retorna null si la factura no fue fiscalizada o no está EMITTED.
   */
  @Query(() => AfipInvoice, {
    name: "afipInvoice",
    nullable: true,
    description: "Obtiene los datos de fiscalización AFIP de una factura",
  })
  async getAfipInvoice(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
    @CurrentUser() user: User,
  ): Promise<AfipInvoice | null> {
    return this.afipInvoiceService.findByInvoiceId(invoiceId, user.academyId);
  }

  /**
   * Genera y retorna el PDF de la factura AFIP en base64.
   */
  @Query(() => String, {
    name: "afipInvoicePdf",
    description:
      "Genera el PDF de la factura AFIP y retorna el contenido en base64",
  })
  async getAfipInvoicePdf(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
    @CurrentUser() user: User,
  ): Promise<string> {
    return this.afipInvoiceService.generatePdf(invoiceId, user.academyId);
  }

  /**
   * Envía la factura AFIP por email al destinatario.
   */
  @Mutation(() => Boolean, {
    name: "sendAfipInvoiceEmail",
    description: "Envía la factura AFIP por email con el PDF adjunto",
  })
  async sendAfipInvoiceEmail(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.afipInvoiceService.sendByEmail(invoiceId, user.academyId);
  }

  /**
   * Envía las facturas AFIP por email en bulk (solo las exitosas).
   * Retorna la cantidad de emails enviados.
   */
  @Mutation(() => Int, {
    name: "bulkSendAfipInvoiceEmails",
    description:
      "Envía facturas AFIP por email en bulk. Retorna cantidad de emails enviados.",
  })
  async bulkSendAfipInvoiceEmails(
    @Args("invoiceIds", { type: () => [ID] }) invoiceIds: string[],
    @CurrentUser() user: User,
  ): Promise<number> {
    return this.afipInvoiceService.bulkSendByEmail(invoiceIds, user.academyId);
  }
}
