import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { PaymentsService } from "./payments.service";
import { Payment } from "./entities/payment.entity";
import { Invoice } from "../invoices/entities/invoice.entity";
import { AddPaymentInput } from "./dto/add-payment.input";
import { VoidPaymentInput } from "./dto/void-payment.input";

@Resolver(() => Payment)
export class PaymentsResolver {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Agrega un pago a una factura.
   */
  @Mutation(() => Invoice, { description: "Agrega un pago a una factura" })
  async addPayment(@Args("input") input: AddPaymentInput): Promise<Invoice> {
    return this.paymentsService.addPayment(input);
  }

  /**
   * Anula un pago (soft delete).
   */
  @Mutation(() => Invoice, { description: "Anula un pago (soft delete)" })
  async voidPayment(@Args("input") input: VoidPaymentInput): Promise<Invoice> {
    return this.paymentsService.voidPayment(input);
  }

  /**
   * Obtiene un pago por ID.
   */
  @Query(() => Payment, {
    name: "payment",
    description: "Obtiene un pago por ID",
  })
  async findOne(@Args("id", { type: () => ID }) id: string): Promise<Payment> {
    return this.paymentsService.findById(id);
  }

  /**
   * Lista los pagos de una factura.
   */
  @Query(() => [Payment], {
    name: "paymentsByInvoice",
    description: "Lista los pagos de una factura",
  })
  async findByInvoice(
    @Args("invoiceId", { type: () => ID }) invoiceId: string,
  ): Promise<Payment[]> {
    return this.paymentsService.findByInvoice(invoiceId);
  }
}
