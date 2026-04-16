import { ObjectType, Field, Int } from "@nestjs/graphql";
import { InvoiceStatus } from "../enums/invoice-status.enum";
import { InvoiceLine } from "./invoice-line.entity";
import { Payment } from "../../payments/entities/payment.entity";
import { Student } from "../../students/entities/student.entity";
import { Family } from "../../families/entities/family.entity";

@ObjectType()
export class Invoice {
  @Field()
  id: string;

  @Field(() => Int, { description: "Número de factura secuencial" })
  invoiceNumber: number;

  @Field({
    nullable: true,
    description: "ID del estudiante (null si es OTHER)",
  })
  studentId?: string;

  @Field(() => Student, { nullable: true })
  student?: Student;

  @Field({
    nullable: true,
    description: "ID de la familia (null si no es familia)",
  })
  familyId?: string;

  @Field(() => Family, { nullable: true })
  family?: Family;

  @Field({ description: "Nombre del destinatario" })
  recipientName: string;

  @Field({ nullable: true })
  recipientEmail?: string;

  @Field({ nullable: true })
  recipientPhone?: string;

  @Field({ nullable: true })
  recipientAddress?: string;

  @Field({ description: "Fecha de emisión" })
  issueDate: Date;

  @Field({ description: "Fecha de vencimiento" })
  dueDate: Date;

  @Field({
    nullable: true,
    description: "Notas públicas (visibles al cliente)",
  })
  publicNotes?: string;

  @Field({ nullable: true, description: "Notas privadas (internas)" })
  privateNotes?: string;

  @Field(() => InvoiceStatus)
  status: InvoiceStatus;

  @Field(() => Int, {
    description: "Subtotal en centavos (suma de originalAmount)",
  })
  subtotal: number;

  @Field(() => Int, { description: "Total de descuentos en centavos" })
  totalDiscount: number;

  @Field(() => Int, { description: "Total en centavos (suma de finalAmount)" })
  total: number;

  @Field(() => Int, {
    description: "Monto pagado en centavos (suma de pagos - devoluciones)",
  })
  paidAmount: number;

  @Field(() => Int, {
    description: "Saldo pendiente en centavos (total - paidAmount)",
  })
  balance: number;

  @Field(() => [InvoiceLine], { description: "Líneas de la factura" })
  lines: InvoiceLine[];

  @Field(() => [Payment], {
    nullable: true,
    description: "Pagos asociados a esta factura",
  })
  payments?: Payment[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
