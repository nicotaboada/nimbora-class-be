import { InvoicesService } from "./invoices.service";
import {
  getTestPrismaService,
  disconnectTestPrisma,
  TestPrismaService,
} from "../../test/test-database";
import { PrismaService } from "../prisma/prisma.service";
import { ChargeStatus, InvoiceStatus } from "@prisma/client";

/**
 * Test Plan — Invoice Module (Integration)
 * Convenciones:
 * - Montos en centavos (Int)
 * - Charge.status: PENDING | INVOICED | PAID
 * - Invoice.status: ISSUED | PAID | PARTIALLY_PAID | VOID
 * - InvoiceLine.isActive: true = activa, false = histórica
 */
describe("InvoicesService (Integration)", () => {
  let service: InvoicesService;
  let prisma: TestPrismaService;
  let testStudentId: string;
  let testStudent2Id: string;
  let testFeeId: string;
  let c1Id: string;
  let c2Id: string;
  let c3Id: string;
  let c4Id: string;

  beforeAll(async () => {
    prisma = await getTestPrismaService();
    service = new InvoicesService(prisma as unknown as PrismaService);
  }, 30_000);

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    // TRUNCATE es más rápido que DELETE para limpiar tablas
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "InvoiceLine", "Invoice", "Charge", "Fee", "Student" CASCADE
    `);

    // Crear datos usando una sola transacción (más rápido)
    const result = await prisma.$transaction(async (tx) => {
      // Crear Student S1
      const student = await tx.student.create({
        data: {
          firstName: "Test",
          lastName: "Student",
          email: `test-${Date.now()}@example.com`,
        },
      });

      // Crear Student S2 para tests de validación
      const student2 = await tx.student.create({
        data: {
          firstName: "Other",
          lastName: "Student",
          email: `other-${Date.now()}@example.com`,
        },
      });

      // Crear Fee base
      const fee = await tx.fee.create({
        data: {
          description: "Cuota Mensual",
          type: "MONTHLY",
          startDate: new Date("2026-01-01"),
          cost: 10_000,
        },
      });

      // Crear 4 Charges para S1 en batch
      const c1 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: student.id,
          amount: 10_000,
          periodMonth: "2026-01",
          installmentNumber: 1,
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c2 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: student.id,
          amount: 10_000,
          periodMonth: "2026-02",
          installmentNumber: 2,
          issueDate: new Date("2026-02-01"),
          dueDate: new Date("2026-02-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c3 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: student.id,
          amount: 10_000,
          periodMonth: "2026-03",
          installmentNumber: 3,
          issueDate: new Date("2026-03-01"),
          dueDate: new Date("2026-03-10"),
          status: ChargeStatus.PENDING,
        },
      });

      const c4 = await tx.charge.create({
        data: {
          feeId: fee.id,
          studentId: student.id,
          amount: 10_000,
          periodMonth: "2026-04",
          installmentNumber: 4,
          issueDate: new Date("2026-04-01"),
          dueDate: new Date("2026-04-10"),
          status: ChargeStatus.PENDING,
        },
      });

      return { student, student2, fee, c1, c2, c3, c4 };
    });

    testStudentId = result.student.id;
    testStudent2Id = result.student2.id;
    testFeeId = result.fee.id;
    c1Id = result.c1.id;
    c2Id = result.c2.id;
    c3Id = result.c3.id;
    c4Id = result.c4.id;
  });

  // ============================================================
  // A) Create Invoice — Happy paths
  // ============================================================
  describe("A) Create Invoice - Happy paths", () => {
    it("T1 — Crear invoice sin descuentos (1 línea)", async () => {
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        recipientEmail: "test@example.com",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      expect(result.status).toBe(InvoiceStatus.ISSUED);
      expect(result.subtotal).toBe(10_000);
      expect(result.totalDiscount).toBe(0);
      expect(result.total).toBe(10_000);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].chargeId).toBe(c1Id);
      expect(result.lines[0].originalAmount).toBe(10_000);
      expect(result.lines[0].discountType).toBeUndefined();
      expect(result.lines[0].discountValue).toBeUndefined();
      expect(result.lines[0].finalAmount).toBe(10_000);

      // Verificar que C1.status = INVOICED
      const charge = await prisma.charge.findUnique({ where: { id: c1Id } });
      expect(charge?.status).toBe(ChargeStatus.INVOICED);
    });

    it("T2 — Crear invoice sin descuentos (4 líneas)", async () => {
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
          { type: "CHARGE", chargeId: c3Id },
          { type: "CHARGE", chargeId: c4Id },
        ],
      });

      expect(result.subtotal).toBe(40_000);
      expect(result.totalDiscount).toBe(0);
      expect(result.total).toBe(40_000);
      expect(result.lines).toHaveLength(4);
      expect(
        result.lines.every((l) => l.finalAmount === l.originalAmount),
      ).toBe(true);

      // Verificar que todos los charges están INVOICED
      const charges = await prisma.charge.findMany({
        where: { id: { in: [c1Id, c2Id, c3Id, c4Id] } },
      });
      expect(charges.every((c) => c.status === ChargeStatus.INVOICED)).toBe(
        true,
      );
    });

    it("T3 — Crear invoice con recipient OTHER (sin studentId)", async () => {
      const result = await service.createInvoice({
        recipientName: "Juan Perez",
        recipientEmail: "juan@external.com",
        recipientPhone: "+1234567890",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
        ],
      });

      expect(result.studentId).toBeUndefined();
      expect(result.recipientName).toBe("Juan Perez");
      expect(result.subtotal).toBe(20_000);
      expect(result.total).toBe(20_000);
      expect(result.lines).toHaveLength(2);

      // Verificar que los charges están INVOICED
      const charges = await prisma.charge.findMany({
        where: { id: { in: [c1Id, c2Id] } },
      });
      expect(charges.every((c) => c.status === ChargeStatus.INVOICED)).toBe(
        true,
      );
    });

    it("T4 — Crear invoice con descuentos percent (4 líneas 10%)", async () => {
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          {
            type: "CHARGE",
            chargeId: c1Id,
            discountType: "PERCENT",
            discountValue: 10,
          },
          {
            type: "CHARGE",
            chargeId: c2Id,
            discountType: "PERCENT",
            discountValue: 10,
          },
          {
            type: "CHARGE",
            chargeId: c3Id,
            discountType: "PERCENT",
            discountValue: 10,
          },
          {
            type: "CHARGE",
            chargeId: c4Id,
            discountType: "PERCENT",
            discountValue: 10,
          },
        ],
      });

      expect(result.subtotal).toBe(40_000);
      expect(result.totalDiscount).toBe(4000);
      expect(result.total).toBe(36_000);

      for (const line of result.lines) {
        expect(line.originalAmount).toBe(10_000);
        expect(line.finalAmount).toBe(9000);
        expect(line.discountValue).toBe(10);
      }
    });

    it("T5 — Crear invoice con descuento FIXED ($1500)", async () => {
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          {
            type: "CHARGE",
            chargeId: c1Id,
            discountType: "FIXED_AMOUNT",
            discountValueFixed: 1500,
          },
        ],
      });

      expect(result.subtotal).toBe(10_000);
      expect(result.totalDiscount).toBe(1500);
      expect(result.total).toBe(8500);
      expect(result.lines[0].finalAmount).toBe(8500);
    });
  });

  // ============================================================
  // B) Manual lines
  // ============================================================
  describe("B) Manual lines", () => {
    it("T6 — Crear invoice con 3 charges y 1 line manual", async () => {
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
          { type: "CHARGE", chargeId: c3Id },
          { type: "MANUAL", description: "Materiales", originalAmount: 5000 },
        ],
      });

      expect(result.subtotal).toBe(35_000);
      expect(result.totalDiscount).toBe(0);
      expect(result.total).toBe(35_000);
      expect(result.lines).toHaveLength(4);

      const manualLine = result.lines.find((l) => l.type === "MANUAL");
      expect(manualLine).toBeDefined();
      expect(manualLine?.chargeId).toBeUndefined();
      expect(manualLine?.description).toBe("Materiales");

      // Verificar que C1,C2,C3 están INVOICED
      const charges = await prisma.charge.findMany({
        where: { id: { in: [c1Id, c2Id, c3Id] } },
      });
      expect(charges.every((c) => c.status === ChargeStatus.INVOICED)).toBe(
        true,
      );
    });
  });

  // ============================================================
  // C) Remove line / Re-invoice
  // ============================================================
  describe("C) Remove line / Re-invoice", () => {
    it("T7 — Remover una línea (invoice sin pagos)", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
          { type: "CHARGE", chargeId: c3Id },
        ],
      });

      // Encontrar la línea de C2
      const lineC2 = invoice.lines.find((l) => l.chargeId === c2Id);
      expect(lineC2).toBeDefined();

      const result = await service.removeInvoiceLine(lineC2.id);

      // Solo 2 líneas activas
      expect(result.lines).toHaveLength(2);
      expect(result.subtotal).toBe(20_000);
      expect(result.total).toBe(20_000);

      // Verificar que C2 volvió a PENDING
      const charge = await prisma.charge.findUnique({ where: { id: c2Id } });
      expect(charge?.status).toBe(ChargeStatus.PENDING);

      // Verificar que la línea existe pero isActive=false
      const allLines = await prisma.invoiceLine.findMany({
        where: { invoiceId: invoice.id },
      });
      expect(allLines).toHaveLength(3);
      const inactiveLine = allLines.find((l) => l.chargeId === c2Id);
      expect(inactiveLine?.isActive).toBe(false);
    });

    it("T8 — Remover línea y luego crear nueva invoice con ese charge", async () => {
      // Crear invoice inicial con C1, C2, C3
      const invoice1 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
          { type: "CHARGE", chargeId: c3Id },
        ],
      });

      // Remover C2
      const lineC2 = invoice1.lines.find((l) => l.chargeId === c2Id);
      await service.removeInvoiceLine(lineC2.id);

      // Crear nueva invoice con C2
      const invoice2 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-15"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c2Id }],
      });

      expect(invoice2.id).toBeDefined();
      expect(invoice2.lines).toHaveLength(1);
      expect(invoice2.lines[0].chargeId).toBe(c2Id);

      // C2 vuelve a INVOICED
      const charge = await prisma.charge.findUnique({ where: { id: c2Id } });
      expect(charge?.status).toBe(ChargeStatus.INVOICED);

      // La línea histórica en invoice1 sigue isActive=false
      const oldLines = await prisma.invoiceLine.findMany({
        where: { invoiceId: invoice1.id, chargeId: c2Id },
      });
      expect(oldLines[0].isActive).toBe(false);
    });
  });

  // ============================================================
  // D) VOID / Delete (soft delete)
  // ============================================================
  describe("D) VOID / Delete (soft delete)", () => {
    it("T9 — Void invoice sin pagos", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
          { type: "CHARGE", chargeId: c3Id },
        ],
      });

      const result = await service.voidInvoice(invoice.id);

      expect(result.status).toBe(InvoiceStatus.VOID);
      expect(result.lines).toHaveLength(0); // Solo devuelve líneas activas

      // Todos los charges vuelven a PENDING
      const charges = await prisma.charge.findMany({
        where: { id: { in: [c1Id, c2Id, c3Id] } },
      });
      expect(charges.every((c) => c.status === ChargeStatus.PENDING)).toBe(
        true,
      );

      // Todas las líneas están inactivas
      const allLines = await prisma.invoiceLine.findMany({
        where: { invoiceId: invoice.id },
      });
      expect(allLines.every((l) => !l.isActive)).toBe(true);
    });

    it("T10 — Void y luego re-facturar mismos charges", async () => {
      const invoice1 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
        ],
      });

      await service.voidInvoice(invoice1.id);

      // Crear nueva invoice con C1, C2
      const invoice2 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-15"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
        ],
      });

      expect(invoice2.id).toBeDefined();
      expect(invoice2.lines).toHaveLength(2);

      // C1, C2 vuelven a INVOICED
      const charges = await prisma.charge.findMany({
        where: { id: { in: [c1Id, c2Id] } },
      });
      expect(charges.every((c) => c.status === ChargeStatus.INVOICED)).toBe(
        true,
      );
    });
  });

  // ============================================================
  // E) Validaciones / Errores
  // ============================================================
  describe("E) Validaciones - Errores", () => {
    it("T11 — No permitir crear invoice sin líneas", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [],
        }),
      ).rejects.toThrow();
    });

    it("T12 — No permitir chargeId duplicado en líneas", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [
            { type: "CHARGE", chargeId: c1Id },
            { type: "CHARGE", chargeId: c1Id },
          ],
        }),
      ).rejects.toThrow("Duplicate chargeId in lines");
    });

    it("T13 — No permitir charge no PENDING", async () => {
      // Primero crear invoice que marque C1 como INVOICED
      await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      // Intentar usar C1 de nuevo
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-15"),
          dueDate: new Date("2026-01-31"),
          lines: [{ type: "CHARGE", chargeId: c1Id }],
        }),
      ).rejects.toThrow(/no encontrados o no disponibles/);
    });

    it("T14 — No permitir charge de otro student", async () => {
      // Crear charge para student2
      const chargeOther = await prisma.charge.create({
        data: {
          feeId: testFeeId,
          studentId: testStudent2Id,
          amount: 10_000,
          periodMonth: "2026-05",
          installmentNumber: 1,
          issueDate: new Date("2026-05-01"),
          dueDate: new Date("2026-05-10"),
          status: ChargeStatus.PENDING,
        },
      });

      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [{ type: "CHARGE", chargeId: chargeOther.id }],
        }),
      ).rejects.toThrow("Charge does not belong to student");
    });

    it("T14b — addInvoiceLine: no permitir charge de otro student", async () => {
      // Crear invoice para student1
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      // Crear charge para student2
      const chargeOther = await prisma.charge.create({
        data: {
          feeId: testFeeId,
          studentId: testStudent2Id,
          amount: 10_000,
          periodMonth: "2026-06",
          installmentNumber: 1,
          issueDate: new Date("2026-06-01"),
          dueDate: new Date("2026-06-10"),
          status: ChargeStatus.PENDING,
        },
      });

      // Intentar agregar charge de student2 a invoice de student1
      await expect(
        service.addInvoiceLine({
          invoiceId: invoice.id,
          line: { type: "CHARGE", chargeId: chargeOther.id },
        }),
      ).rejects.toThrow("Charge does not belong to student");
    });
  });

  // ============================================================
  // F) Validaciones de descuentos
  // ============================================================
  describe("F) Validaciones de descuentos", () => {
    it("T15 — Percent > 100 => error", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [
            {
              type: "CHARGE",
              chargeId: c1Id,
              discountType: "PERCENT",
              discountValue: 150,
            },
          ],
        }),
      ).rejects.toThrow("Percent discount must be between 0 and 100");
    });

    it("T16 — Percent negativo => error", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [
            {
              type: "CHARGE",
              chargeId: c1Id,
              discountType: "PERCENT",
              discountValue: -10,
            },
          ],
        }),
      ).rejects.toThrow("Discount value cannot be negative");
    });

    it("T17 — Fixed > originalAmount => error", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [
            {
              type: "CHARGE",
              chargeId: c1Id,
              discountType: "FIXED_AMOUNT",
              discountValueFixed: 15_000,
            },
          ],
        }),
      ).rejects.toThrow("Discount exceeds amount");
    });

    it("T18 — Fixed negativo => error", async () => {
      await expect(
        service.createInvoice({
          studentId: testStudentId,
          recipientName: "Test Student",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-31"),
          lines: [
            {
              type: "CHARGE",
              chargeId: c1Id,
              discountType: "FIXED_AMOUNT",
              discountValueFixed: -500,
            },
          ],
        }),
      ).rejects.toThrow("Discount value cannot be negative");
    });

    it("T19 — Nunca finalAmount < 0 (borde: descuento igual a monto)", async () => {
      // Caso borde: descuento igual al monto, finalAmount debería ser 0
      const result = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          {
            type: "CHARGE",
            chargeId: c1Id,
            discountType: "FIXED_AMOUNT",
            discountValueFixed: 10_000,
          },
        ],
      });

      expect(result.lines[0].finalAmount).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // ============================================================
  // G) Update InvoiceLine + Totals recalculation
  // ============================================================
  describe("G) Update InvoiceLine + Totals recalculation", () => {
    it("T20 — Update descuento en una línea recalcula totales", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
        ],
      });

      expect(invoice.subtotal).toBe(20_000);
      expect(invoice.total).toBe(20_000);

      // Aplicar descuento del 10% a línea de C1
      const lineC1 = invoice.lines.find((l) => l.chargeId === c1Id);
      const result = await service.updateInvoiceLine({
        lineId: lineC1.id,
        discountType: "PERCENT",
        discountValue: 10,
        discountReason: "Descuento especial",
      });

      // Verificar que la línea tiene el descuento
      const updatedLineC1 = result.lines.find((l) => l.chargeId === c1Id);
      expect(updatedLineC1?.finalAmount).toBe(9000);

      // Verificar totales del invoice
      expect(result.subtotal).toBe(20_000);
      expect(result.totalDiscount).toBe(1000);
      expect(result.total).toBe(19_000);
    });

    it("T21 — Update descuento y luego remove la línea", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          { type: "CHARGE", chargeId: c1Id },
          { type: "CHARGE", chargeId: c2Id },
        ],
      });

      // Aplicar descuento a C1
      const lineC1 = invoice.lines.find((l) => l.chargeId === c1Id);
      await service.updateInvoiceLine({
        lineId: lineC1.id,
        discountType: "PERCENT",
        discountValue: 20,
        discountReason: "Promo",
      });

      // Remover la línea con descuento
      const result = await service.removeInvoiceLine(lineC1.id);

      // Verificar que solo queda C2
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].chargeId).toBe(c2Id);
      expect(result.subtotal).toBe(10_000);
      expect(result.totalDiscount).toBe(0);
      expect(result.total).toBe(10_000);

      // C1 vuelve a PENDING
      const charge = await prisma.charge.findUnique({ where: { id: c1Id } });
      expect(charge?.status).toBe(ChargeStatus.PENDING);

      // La línea histórica conserva el descuento
      const historicLine = await prisma.invoiceLine.findFirst({
        where: { invoiceId: invoice.id, chargeId: c1Id, isActive: false },
      });
      expect(historicLine?.discountType).toBe("PERCENT");
      expect(historicLine?.discountValue).toBe(20);

      // Re-facturar C1 sin descuento
      const newInvoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-15"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      // No arrastra el descuento
      expect(newInvoice.lines[0].discountType).toBeUndefined();
      expect(newInvoice.lines[0].discountValue).toBeUndefined();
      expect(newInvoice.lines[0].finalAmount).toBe(10_000);
    });
  });

  // ============================================================
  // H) Concurrencia
  // ============================================================
  describe("H) Concurrencia", () => {
    it("T22 — Dos createInvoice simultáneos con mismo charge", async () => {
      // Ejecutar en paralelo
      const promise1 = service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      const promise2 = service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      const results = await Promise.allSettled([promise1, promise2]);

      // Uno debería tener éxito, otro debería fallar
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verificar que solo existe una invoice line activa para C1
      const activeLines = await prisma.invoiceLine.findMany({
        where: { chargeId: c1Id, isActive: true },
      });
      expect(activeLines).toHaveLength(1);
    });
  });

  // ============================================================
  // T25) Descuento -> Remove -> Re-invoice
  // ============================================================
  describe("T25) Descuento -> Remove -> Re-invoice", () => {
    it("descuento aplicado, remove line, re-facturar limpio", async () => {
      // 1) Crear invoice con descuento
      const invoice1 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [
          {
            type: "CHARGE",
            chargeId: c1Id,
            discountType: "PERCENT",
            discountValue: 10,
            discountReason: "Promo",
          },
        ],
      });

      expect(invoice1.subtotal).toBe(10_000);
      expect(invoice1.totalDiscount).toBe(1000);
      expect(invoice1.total).toBe(9000);
      expect(invoice1.lines[0].discountType).toBe("PERCENT");
      expect(invoice1.lines[0].discountValue).toBe(10);
      expect(invoice1.lines[0].finalAmount).toBe(9000);

      // Verificar charge
      let charge = await prisma.charge.findUnique({ where: { id: c1Id } });
      expect(charge?.status).toBe(ChargeStatus.INVOICED);
      expect(charge?.amount).toBe(10_000); // El charge NO cambia

      // 2) Remover la línea con descuento
      await service.removeInvoiceLine(invoice1.lines[0].id);

      // Verificar línea histórica
      const historicLine = await prisma.invoiceLine.findFirst({
        where: { invoiceId: invoice1.id, chargeId: c1Id, isActive: false },
      });
      expect(historicLine).toBeDefined();
      expect(historicLine?.discountType).toBe("PERCENT");
      expect(historicLine?.discountValue).toBe(10);

      // Verificar charge volvió a PENDING
      charge = await prisma.charge.findUnique({ where: { id: c1Id } });
      expect(charge?.status).toBe(ChargeStatus.PENDING);
      expect(charge?.amount).toBe(10_000);

      // 3) Re-facturar el mismo charge SIN descuento
      const invoice2 = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-15"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      // Verificar que NO arrastra el descuento
      expect(invoice2.lines[0].chargeId).toBe(c1Id);
      expect(invoice2.lines[0].discountType).toBeUndefined();
      expect(invoice2.lines[0].discountValue).toBeUndefined();
      expect(invoice2.lines[0].discountReason).toBeUndefined();
      expect(invoice2.lines[0].originalAmount).toBe(10_000);
      expect(invoice2.lines[0].finalAmount).toBe(10_000);
      expect(invoice2.subtotal).toBe(10_000);
      expect(invoice2.totalDiscount).toBe(0);
      expect(invoice2.total).toBe(10_000);

      // Verificar que charge está INVOICED
      charge = await prisma.charge.findUnique({ where: { id: c1Id } });
      expect(charge?.status).toBe(ChargeStatus.INVOICED);

      // Verificar que existen 2 invoiceLines para C1 (una activa, una histórica)
      const allLines = await prisma.invoiceLine.findMany({
        where: { chargeId: c1Id },
      });
      expect(allLines).toHaveLength(2);
      expect(allLines.filter((l) => l.isActive)).toHaveLength(1);
      expect(allLines.filter((l) => !l.isActive)).toHaveLength(1);
    });
  });

  // ============================================================
  // Queries básicas
  // ============================================================
  describe("Queries básicas", () => {
    it("findById — debe encontrar una factura por ID", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      const result = await service.findById(invoice.id);

      expect(result.id).toBe(invoice.id);
      expect(result.recipientName).toBe("Test Student");
    });

    it("findAll — debe listar facturas con filtro de estudiante", async () => {
      await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      const result = await service.findAll({ studentId: testStudentId });

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((inv) => inv.studentId === testStudentId)).toBe(true);
    });

    it("findAll — debe listar facturas con filtro de status", async () => {
      const invoice = await service.createInvoice({
        studentId: testStudentId,
        recipientName: "Test Student",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-31"),
        lines: [{ type: "CHARGE", chargeId: c1Id }],
      });

      await service.voidInvoice(invoice.id);

      const voidedInvoices = await service.findAll({
        status: InvoiceStatus.VOID,
      });
      expect(voidedInvoices.some((inv) => inv.id === invoice.id)).toBe(true);

      const issuedInvoices = await service.findAll({
        status: InvoiceStatus.ISSUED,
      });
      expect(issuedInvoices.every((inv) => inv.id !== invoice.id)).toBe(true);
    });
  });
});
