import { task, logger } from "@trigger.dev/sdk";
import {
  Prisma,
  PrismaClient,
  AcademyTaxStatus,
  BillingDocType,
  BillingTaxCondition,
  AfipFiscalStatus,
} from "@prisma/client";
import type Afip from "@afipsdk/afip.js";
import { createAfipInstance } from "../afip/utils/create-afip-instance";
import {
  CBTE_TIPO,
  resolveCbteTipo,
  resolveDocTipo,
  resolveCondicionIvaReceptor,
} from "../afip/utils/resolve-cbte-tipo";

const prisma = new PrismaClient();

interface BulkAfipPayload {
  operationId: string;
  invoiceIds: string[];
  ptoVta: number;
  cbteFch: string; // ISO date
  academyId: string;
}

interface AfipItemResult {
  invoiceId: string;
  studentName: string;
  invoiceNumber: number;
  status: "emitted" | "failed" | "skipped";
  cbteNro?: number;
  cae?: string;
  total?: number;
  error?: string;
}

// Prisma dynamic accessor for bulkOperation (same pattern as bulk-create-invoices)
const bulkOp = (prisma as unknown as Record<string, unknown>)[
  "bulkOperation"
] as {
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};
const updateOperation = (id: string, data: Record<string, unknown>) =>
  bulkOp.update({ where: { id }, data });

/**
 * Formats a Date as YYYYMMDD for AFIP
 */
function formatAfipDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export const bulkCreateAfipInvoicesTask = task({
  id: "bulk-create-afip-invoices",
  retry: { maxAttempts: 1 },
  run: async (payload: BulkAfipPayload) => {
    const { operationId, invoiceIds, ptoVta, cbteFch, academyId } = payload;
    // Parse date preserving the intended date (avoid timezone shifts)
    const cbteFchClean = cbteFch.split("T")[0]; // "2026-03-27"
    const [year, month, day] = cbteFchClean.split("-").map(Number);
    const emissionDate = new Date(year, month - 1, day);

    await updateOperation(operationId, {
      status: "PROCESSING",
      startedAt: new Date(),
    });

    // Load academy AFIP settings
    const afipSettings = await prisma.academyAfipSettings.findUnique({
      where: { academyId },
    });

    if (!afipSettings) {
      await updateOperation(operationId, {
        status: "FAILED",
        completedAt: new Date(),
      });
      throw new Error("La academia no tiene configuración AFIP");
    }

    const afip = createAfipInstance(afipSettings);

    const results: AfipItemResult[] = [];
    let completedItems = 0;
    let failedItems = 0;
    let skippedItems = 0;

    // Cache last voucher number per cbteTipo. Reset on error to force re-query.
    const lastVoucherByTipo = new Map<number, number>();

    for (const invoiceId of invoiceIds) {
      try {
        const result = await processInvoice(
          invoiceId,
          afipSettings,
          afip,
          ptoVta,
          emissionDate,
          lastVoucherByTipo,
        );

        results.push(result);

        if (result.status === "emitted") completedItems++;
        else if (result.status === "skipped") skippedItems++;
        else {
          failedItems++;
          lastVoucherByTipo.clear(); // Force re-query after failure
        }
      } catch (error) {
        failedItems++;
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";

        logger.error(`Failed to process invoice ${invoiceId}`, {
          error: errorMessage,
        });

        results.push({
          invoiceId,
          studentName: "Unknown",
          invoiceNumber: 0,
          status: "failed",
          error: errorMessage,
        });
      }

      await updateOperation(operationId, {
        completedItems,
        failedItems,
        skippedItems,
        results: structuredClone(results),
      });
    }

    await updateOperation(operationId, {
      status: "COMPLETED",
      completedAt: new Date(),
      completedItems,
      failedItems,
      skippedItems,
      results: structuredClone(results),
    });

    logger.info("Bulk AFIP invoice creation completed", {
      operationId,
      completedItems,
      failedItems,
      skippedItems,
    });

    return { completedItems, failedItems, skippedItems };
  },
});

async function processInvoice(
  invoiceId: string,
  afipSettings: { taxStatus: AcademyTaxStatus; cuit: string },
  afip: Afip,
  ptoVta: number,
  emissionDate: Date,
  lastVoucherByTipo: Map<number, number>,
): Promise<AfipItemResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      billingProfile: true,
      student: true,
      afip: true,
    },
  });

  if (!invoice) {
    return {
      invoiceId,
      studentName: "Unknown",
      invoiceNumber: 0,
      status: "failed",
      error: "Factura no encontrada",
    };
  }

  const studentName = invoice.recipientName;

  // Skip if already emitted
  if (invoice.afip?.status === AfipFiscalStatus.EMITTED) {
    return {
      invoiceId,
      studentName,
      invoiceNumber: invoice.invoiceNumber,
      status: "skipped",
      error: "Ya emitida en AFIP",
    };
  }

  // Resolve fiscal data
  const recipientTaxCondition =
    invoice.billingProfile?.taxCondition ??
    BillingTaxCondition.CONSUMIDOR_FINAL;
  const docType =
    invoice.billingProfile?.docType ?? BillingDocType.CONSUMIDOR_FINAL;
  const docNumber = invoice.billingProfile?.docNumber ?? null;

  const cbteTipo = resolveCbteTipo(
    afipSettings.taxStatus,
    recipientTaxCondition,
  );
  const docTipo = resolveDocTipo(docType);
  const docNro =
    docType === BillingDocType.CONSUMIDOR_FINAL
      ? 0
      : Number(docNumber?.replaceAll(/\D/g, "") ?? 0);

  // Use cached number if available, otherwise query AFIP
  let cbteNro: number;
  const cachedVoucher = lastVoucherByTipo.get(cbteTipo);
  if (cachedVoucher === undefined) {
    const lastVoucher = Number(
      await afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo),
    );
    cbteNro = lastVoucher + 1;
  } else {
    cbteNro = cachedVoucher + 1;
  }
  lastVoucherByTipo.set(cbteTipo, cbteNro);

  const cbteFchFormatted = formatAfipDate(emissionDate);
  const impTotal = invoice.total / 100;

  const afipInvoiceData = {
    status: AfipFiscalStatus.EMITTING,
    recipientName: studentName,
    docType,
    docNumber,
    taxCondition: recipientTaxCondition,
    ptoVta,
    cbteTipo,
    concepto: 2,
    cbteFch: emissionDate,
  };

  const afipInvoice = await (invoice.afip
    ? prisma.afipInvoice.update({
        where: { id: invoice.afip.id },
        data: { ...afipInvoiceData, lastError: null },
      })
    : prisma.afipInvoice.create({
        data: {
          ...afipInvoiceData,
          invoiceId: invoice.id,
        },
      }));

  try {
    // Build AFIP voucher data
    const voucherData: Record<string, unknown> = {
      CantReg: 1,
      PtoVta: ptoVta,
      CbteTipo: cbteTipo,
      Concepto: 2, // Servicios
      DocTipo: docTipo,
      DocNro: docNro,
      CbteDesde: cbteNro,
      CbteHasta: cbteNro,
      CbteFch: cbteFchFormatted,
      ImpTotal: impTotal,
      ImpTotConc: cbteTipo === CBTE_TIPO.FACTURA_A ? 0 : impTotal,
      ImpNeto: cbteTipo === CBTE_TIPO.FACTURA_A ? impTotal : 0,
      ImpOpEx: 0,
      ImpIVA: 0,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      CondicionIVAReceptorId: resolveCondicionIvaReceptor(
        recipientTaxCondition,
      ),
      // Concepto 2 requires service dates
      FchServDesde: cbteFchFormatted,
      FchServHasta: cbteFchFormatted,
      FchVtoPago: cbteFchFormatted,
    };

    const result = (await afip.ElectronicBilling.createVoucher(
      voucherData,
    )) as {
      CAE: string;
      CAEFchVto: string;
    };

    const caeVto = new Date(result.CAEFchVto);

    await prisma.afipInvoice.update({
      where: { id: afipInvoice.id },
      data: {
        status: AfipFiscalStatus.EMITTED,
        cbteNro,
        cae: result.CAE,
        caeVto,
        responseJson: result as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      invoiceId,
      studentName,
      invoiceNumber: invoice.invoiceNumber,
      status: "emitted",
      cbteNro,
      cae: result.CAE,
      total: invoice.total,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error AFIP desconocido";

    await prisma.afipInvoice.update({
      where: { id: afipInvoice.id },
      data: {
        status: AfipFiscalStatus.ERROR,
        lastError: errorMessage,
        requestJson: { ptoVta, cbteTipo, cbteNro } as Prisma.InputJsonValue,
      },
    });

    return {
      invoiceId,
      studentName,
      invoiceNumber: invoice.invoiceNumber,
      status: "failed",
      error: errorMessage,
    };
  }
}
