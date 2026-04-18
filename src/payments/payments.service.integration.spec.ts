import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { InvoicesService } from "../invoices/invoices.service";
import { StudentsService } from "../students/students.service";
import { TestPrismaService } from "../../test/test-database";
import { PrismaService } from "../prisma/prisma.service";
import {
  Student,
  Charge,
  Fee,
  Invoice,
  InvoiceStatus,
  ChargeStatus,
  PaymentMethod,
} from "@prisma/client";

function expectInvoice(
  invoice: Partial<Invoice>,
  expected: {
    total?: number;
    paidAmount?: number;
    balance?: number;
    status?: InvoiceStatus;
  },
) {
  if (expected.total !== undefined) {
    expect(invoice.total).toBe(expected.total);
  }
  if (expected.paidAmount !== undefined) {
    expect(invoice.paidAmount).toBe(expected.paidAmount);
  }
  if (expected.balance !== undefined) {
    expect(invoice.balance).toBe(expected.balance);
  }
  if (expected.status) {
    expect(invoice.status).toBe(expected.status);
  }
}

describe("PaymentsService Integration Tests", () => {
  let paymentsService: PaymentsService;
  let invoicesService: InvoicesService;
  let testPrisma: TestPrismaService;
  let prisma: PrismaService;
  let testAcademyId: string;

  beforeAll(async () => {
    testPrisma = new TestPrismaService();
    await testPrisma.$connect();
    await testPrisma.ensureSchema();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        InvoicesService,
        StudentsService,
        { provide: PrismaService, useValue: testPrisma },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    invoicesService = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  }, 60_000);

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await testPrisma.cleanDatabase();

    const academy = await prisma.academy.create({
      data: {
        name: "Test Academy",
        slug: "test-academy",
        country: "AR",
        currency: "ARS",
        timezone: "America/Argentina/Buenos_Aires",
        ownerUserId: "test-owner",
      },
    });
    testAcademyId = academy.id;
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  async function seedInvoiceWithCharges(amounts: number[]): Promise<{
    student: Student;
    fee: Fee;
    charges: Charge[];
    invoice: Invoice;
  }> {
    const student = await prisma.student.create({
      data: {
        firstName: "Test",
        lastName: "Student",
        email: `test${Date.now()}@example.com`,
        status: "ENABLED",
        academyId: testAcademyId,
      },
    });

    const fee = await prisma.fee.create({
      data: {
        description: "Test Fee",
        type: "MONTHLY",
        startDate: new Date("2026-01-01"),
        cost: 1000,
        academyId: testAcademyId,
      },
    });

    const charges: Charge[] = [];
    for (const [i, amount] of amounts.entries()) {
      const charge = await prisma.charge.create({
        data: {
          feeId: fee.id,
          studentId: student.id,
          amount: amount,
          periodMonth: "2026-01",
          installmentNumber: i + 1,
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-15"),
          status: "PENDING",
        },
      });
      charges.push(charge);
    }

    const invoiceData = await invoicesService.createInvoice(
      {
        studentId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`,
        recipientEmail: student.email,
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-15"),
        lines: charges.map((c) => ({
          type: "CHARGE" as const,
          chargeId: c.id,
        })),
      },
      testAcademyId,
    );

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceData.id },
    });

    return { student, fee, charges, invoice };
  }

  // ============================================================================
  // P01 — Pagar total ⇒ PAID
  // ============================================================================

  it("P01: Pagar monto total marca invoice como PAID sin crear crédito", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    const result = await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 3000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3000,
      paidAmount: 3000,
      balance: 0,
      status: InvoiceStatus.PAID,
    });

    const payment = await prisma.payment.findFirst({
      where: { invoiceId: invoice.id },
    });
    expect(payment).toBeDefined();
    expect(payment.status).toBe("APPROVED");
    expect(payment.amount).toBe(3000);

    const credit = await prisma.studentCredit.findFirst({
      where: { sourcePaymentId: payment.id },
    });
    expect(credit).toBeNull();
  }, 15_000);

  // ============================================================================
  // P02 — Pago parcial ⇒ PARTIALLY_PAID
  // ============================================================================

  it("P02: Pago parcial marca invoice como PARTIALLY_PAID", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    const result = await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3000,
      paidAmount: 1000,
      balance: 2000,
      status: InvoiceStatus.PARTIALLY_PAID,
    });
  }, 15_000);

  // ============================================================================
  // P03 — void invoice ⇒ VOID + anula payments + libera charges
  // ============================================================================

  it("P03: voidInvoice anula payments, créditos y libera charges", async () => {
    const { invoice, charges } = await seedInvoiceWithCharges([1000, 2000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });

    const result = await invoicesService.voidInvoice(invoice.id, testAcademyId);

    expectInvoice(result, {
      status: InvoiceStatus.VOID,
      paidAmount: 0,
      balance: 0,
    });

    const voidedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(voidedPayment.status).toBe("VOID");

    for (const charge of charges) {
      const updatedCharge = await prisma.charge.findUniqueOrThrow({
        where: { id: charge.id },
      });
      expect(updatedCharge.status).toBe(ChargeStatus.PENDING);
    }
  }, 15_000);

  // ============================================================================
  // P04 — Overpay ⇒ PAID + crea crédito
  // ============================================================================

  it("P04: Overpay marca invoice PAID y crea StudentCredit", async () => {
    const { invoice, student } = await seedInvoiceWithCharges([1000, 2000]);

    const result = await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 4000,
        method: PaymentMethod.CARD,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3000,
      paidAmount: 3000,
      balance: 0,
      status: InvoiceStatus.PAID,
    });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });

    const credit = await prisma.studentCredit.findFirstOrThrow({
      where: { sourcePaymentId: payment.id },
    });

    expect(credit.studentId).toBe(student.id);
    expect(credit.amount).toBe(1000);
    expect(credit.availableAmount).toBe(1000);
    expect(credit.status).toBe("AVAILABLE");
    expect(credit.sourceInvoiceId).toBe(invoice.id);
  }, 15_000);

  // ============================================================================
  // P05 — Pago parcial + voidInvoice ⇒ payment VOID, charges liberados
  // ============================================================================

  it("P05: Pago parcial + voidInvoice anula payment y libera charges", async () => {
    const { invoice, charges } = await seedInvoiceWithCharges([1000, 2000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });

    const result = await invoicesService.voidInvoice(invoice.id, testAcademyId);

    expectInvoice(result, {
      status: InvoiceStatus.VOID,
      paidAmount: 0,
      balance: 0,
    });

    const voidedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(voidedPayment.status).toBe("VOID");

    for (const charge of charges) {
      const updatedCharge = await prisma.charge.findUniqueOrThrow({
        where: { id: charge.id },
      });
      expect(updatedCharge.status).toBe(ChargeStatus.PENDING);
    }
  }, 15_000);

  // ============================================================================
  // P06 — Dos pagos: parcial + segundo que excede ⇒ PAID + crédito
  // ============================================================================

  it("P06: Dos pagos donde el segundo excede crea crédito por el excedente", async () => {
    const { invoice, student } = await seedInvoiceWithCharges([1000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 500,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const result = await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 1000,
      paidAmount: 1000,
      balance: 0,
      status: InvoiceStatus.PAID,
    });

    const credits = await prisma.studentCredit.findMany({
      where: { studentId: student.id },
    });

    expect(credits).toHaveLength(1);
    expect(credits[0].amount).toBe(500);
    expect(credits[0].availableAmount).toBe(500);
    expect(credits[0].status).toBe("AVAILABLE");
  }, 15_000);

  // ============================================================================
  // P07 — voidPayment total ⇒ invoice vuelve a ISSUED
  // ============================================================================

  it("P07: voidPayment de pago total devuelve invoice a ISSUED", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 3000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });

    const result = await paymentsService.voidPayment(
      {
        paymentId: payment.id,
        reason: "Error",
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3000,
      paidAmount: 0,
      balance: 3000,
      status: InvoiceStatus.ISSUED,
    });

    const voidedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(voidedPayment.status).toBe("VOID");
  }, 15_000);

  // ============================================================================
  // P08 — Lock: no permitir editar descuentos ni remover líneas si hay payments
  // ============================================================================

  it("P08: No permite editar descuentos ni remover líneas con payments APPROVED", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const line = await prisma.invoiceLine.findFirstOrThrow({
      where: { invoiceId: invoice.id, isActive: true },
    });

    await expect(
      invoicesService.updateInvoiceLine(
        {
          lineId: line.id,
          discountType: "PERCENT",
          discountValue: 10,
        },
        testAcademyId,
      ),
    ).rejects.toThrow(
      "No se puede modificar una factura con pagos registrados",
    );

    await expect(
      invoicesService.removeInvoiceLine(line.id, testAcademyId),
    ).rejects.toThrow(
      "No se puede modificar una factura con pagos registrados",
    );
  }, 15_000);

  // ============================================================================
  // P09 — Agregar charge/line a invoice sin pagos ⇒ total aumenta
  // ============================================================================

  it("P09: Agregar línea sin pagos aumenta el total correctamente", async () => {
    const { invoice, student, fee } = await seedInvoiceWithCharges([
      1000, 2000,
    ]);

    const newCharge = await prisma.charge.create({
      data: {
        feeId: fee.id,
        studentId: student.id,
        amount: 700,
        periodMonth: "2026-01",
        installmentNumber: 3,
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-15"),
        status: "PENDING",
      },
    });

    const result = await invoicesService.addInvoiceLine(
      {
        invoiceId: invoice.id,
        line: {
          type: "CHARGE",
          chargeId: newCharge.id,
        },
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3700,
      paidAmount: 0,
      balance: 3700,
      status: InvoiceStatus.ISSUED,
    });

    const updatedCharge = await prisma.charge.findUniqueOrThrow({
      where: { id: newCharge.id },
    });
    expect(updatedCharge.status).toBe(ChargeStatus.INVOICED);
  }, 15_000);

  // ============================================================================
  // P10 — No permitir agregar charge/editar invoice si ya tiene pagos
  // ============================================================================

  it("P10: No permite agregar línea si hay payments APPROVED", async () => {
    const { invoice, student, fee } = await seedInvoiceWithCharges([
      1000, 2000,
    ]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 1000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const newCharge = await prisma.charge.create({
      data: {
        feeId: fee.id,
        studentId: student.id,
        amount: 700,
        periodMonth: "2026-01",
        installmentNumber: 3,
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-15"),
        status: "PENDING",
      },
    });

    await expect(
      invoicesService.addInvoiceLine(
        {
          invoiceId: invoice.id,
          line: {
            type: "CHARGE",
            chargeId: newCharge.id,
          },
        },
        testAcademyId,
      ),
    ).rejects.toThrow(
      "No se puede modificar una factura con pagos registrados",
    );
  }, 10_000);

  // ============================================================================
  // P11 — No permitir crear pago en invoice VOID
  // ============================================================================

  it("P11: No permite crear pago en invoice VOID", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    await invoicesService.voidInvoice(invoice.id, testAcademyId);

    await expect(
      paymentsService.addPayment(
        {
          invoiceId: invoice.id,
          amount: 1000,
          method: PaymentMethod.CASH,
          paidAt: new Date(),
        },
        testAcademyId,
      ),
    ).rejects.toThrow("No se puede agregar pagos a una factura anulada");
  }, 10_000);

  // ============================================================================
  // P12 — Overpay + voidPayment ⇒ se revierte el crédito creado
  // ============================================================================

  it("P12: voidPayment con overpay anula el crédito generado", async () => {
    const { invoice } = await seedInvoiceWithCharges([1000, 2000]);

    await paymentsService.addPayment(
      {
        invoiceId: invoice.id,
        amount: 4000,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
      },
      testAcademyId,
    );

    const payment = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id },
    });

    let credit = await prisma.studentCredit.findFirstOrThrow({
      where: { sourcePaymentId: payment.id },
    });
    expect(credit.status).toBe("AVAILABLE");
    expect(credit.amount).toBe(1000);

    const result = await paymentsService.voidPayment(
      {
        paymentId: payment.id,
        reason: "Error",
      },
      testAcademyId,
    );

    expectInvoice(result, {
      total: 3000,
      paidAmount: 0,
      balance: 3000,
      status: InvoiceStatus.ISSUED,
    });

    credit = await prisma.studentCredit.findFirstOrThrow({
      where: { id: credit.id },
    });
    expect(credit.status).toBe("VOID");
  }, 15_000);
});
