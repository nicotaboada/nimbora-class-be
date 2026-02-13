import {
  Charge as PrismaCharge,
  Fee,
  FeePeriod,
  FeeType,
  ChargeStatus,
} from "@prisma/client";
import { Charge } from "../entities/charge.entity";
import { ChargeInvoicingState } from "../enums/charge-invoicing-state.enum";
import {
  addDays,
  addMonths,
  format,
  isBefore,
  setDate,
  setMonth,
} from "date-fns";
import {
  ChargeStartMonth,
  MONTH_MAPPING,
} from "../enums/charge-start-month.enum";
import {
  CHARGE_DAY_OF_MONTH,
  GRACE_DAYS,
} from "../constants/billing.constants";

export interface ChargeDate {
  issueDate: Date;
  dueDate: Date;
  periodMonth: string;
  installmentNumber: number;
}

/**
 * Calcula las fechas de los cargos basándose en el tipo de fee y el mes de inicio.
 */
export function calculateChargeDates(
  fee: Fee,
  startMonth: ChargeStartMonth,
  currentDate: Date = new Date(),
): ChargeDate[] {
  const firstBillingDate = calculateFirstBillingDate(startMonth, currentDate);
  switch (fee.type) {
    case FeeType.ONE_OFF: {
      return calculateOneOffDates(firstBillingDate);
    }
    case FeeType.MONTHLY: {
      return calculateMonthlyDates(firstBillingDate, fee.occurrences ?? 1);
    }
    case FeeType.PERIODIC: {
      if (!fee.period) {
        throw new Error("El fee periódico debe tener un período definido");
      }
      return calculatePeriodicDates(
        firstBillingDate,
        fee.occurrences ?? 1,
        fee.period,
      );
    }
  }
}

/**
 * Calcula la fecha de inicio del cobro según el ChargeStartMonth seleccionado.
 */
function calculateFirstBillingDate(
  startMonth: ChargeStartMonth,
  currentDate: Date,
): Date {
  const baseDate = setDate(currentDate, CHARGE_DAY_OF_MONTH);
  switch (startMonth) {
    case ChargeStartMonth.CURRENT_MONTH: {
      return baseDate;
    }
    case ChargeStartMonth.NEXT_MONTH: {
      return addMonths(baseDate, 1);
    }
    default: {
      const targetMonth = MONTH_MAPPING[startMonth];
      if (!targetMonth) {
        throw new Error(`Mes no válido: ${startMonth}`);
      }
      let result = setMonth(baseDate, targetMonth - 1);
      if (isBefore(result, currentDate)) {
        result = addMonths(result, 12);
      }
      return result;
    }
  }
}

/**
 * Genera un ChargeDate a partir de una fecha de emisión.
 */
function createChargeDate(
  issueDate: Date,
  installmentNumber: number,
): ChargeDate {
  return {
    issueDate,
    dueDate: addDays(issueDate, GRACE_DAYS),
    periodMonth: format(issueDate, "yyyy-MM"),
    installmentNumber,
  };
}

/**
 * ONE_OFF: Un solo cargo en la fecha de inicio.
 */
function calculateOneOffDates(firstBillingDate: Date): ChargeDate[] {
  return [createChargeDate(firstBillingDate, 1)];
}

/**
 * MONTHLY: N cargos, uno por mes.
 */
function calculateMonthlyDates(
  firstBillingDate: Date,
  occurrences: number,
): ChargeDate[] {
  return Array.from({ length: occurrences }, (_, i) => {
    const issueDate = addMonths(firstBillingDate, i);
    return createChargeDate(issueDate, i + 1);
  });
}

/**
 * PERIODIC: N cargos según el período especificado.
 */
function calculatePeriodicDates(
  firstBillingDate: Date,
  occurrences: number,
  period: FeePeriod,
): ChargeDate[] {
  switch (period) {
    case FeePeriod.EVERY_WEEK: {
      return calculateWeeklyDates(firstBillingDate, occurrences);
    }
    case FeePeriod.TWICE_A_MONTH: {
      return calculateTwiceAMonthDates(firstBillingDate, occurrences);
    }
    case FeePeriod.EVERY_MONTH: {
      return calculateMonthlyDates(firstBillingDate, occurrences);
    }
    case FeePeriod.EVERY_2_MONTHS: {
      return calculateEveryNMonthsDates(firstBillingDate, occurrences, 2);
    }
    case FeePeriod.EVERY_3_MONTHS: {
      return calculateEveryNMonthsDates(firstBillingDate, occurrences, 3);
    }
    case FeePeriod.EVERY_4_MONTHS: {
      return calculateEveryNMonthsDates(firstBillingDate, occurrences, 4);
    }
    case FeePeriod.EVERY_5_MONTHS: {
      return calculateEveryNMonthsDates(firstBillingDate, occurrences, 5);
    }
    case FeePeriod.EVERY_6_MONTHS: {
      return calculateEveryNMonthsDates(firstBillingDate, occurrences, 6);
    }
  }
}

/**
 * EVERY_WEEK: Genera cargos semanales (días 1, 8, 15, 22 del mes).
 */
function calculateWeeklyDates(
  firstBillingDate: Date,
  occurrences: number,
): ChargeDate[] {
  const weekDays = [1, 8, 15, 22];
  const dates: ChargeDate[] = [];
  let currentMonth = firstBillingDate;
  let weekIndex = 0;
  for (let i = 0; i < occurrences; i++) {
    const issueDate = setDate(currentMonth, weekDays[weekIndex]);
    dates.push(createChargeDate(issueDate, i + 1));
    weekIndex++;
    if (weekIndex >= weekDays.length) {
      weekIndex = 0;
      currentMonth = addMonths(currentMonth, 1);
    }
  }
  return dates;
}

/**
 * TWICE_A_MONTH: Genera cargos quincenales (días 1 y 15 del mes).
 */
function calculateTwiceAMonthDates(
  firstBillingDate: Date,
  occurrences: number,
): ChargeDate[] {
  const biweeklyDays = [1, 15];
  const dates: ChargeDate[] = [];
  let currentMonth = firstBillingDate;
  let dayIndex = 0;
  for (let i = 0; i < occurrences; i++) {
    const issueDate = setDate(currentMonth, biweeklyDays[dayIndex]);
    dates.push(createChargeDate(issueDate, i + 1));
    dayIndex++;
    if (dayIndex >= biweeklyDays.length) {
      dayIndex = 0;
      currentMonth = addMonths(currentMonth, 1);
    }
  }
  return dates;
}

/**
 * EVERY_N_MONTHS: Genera cargos cada N meses.
 */
function calculateEveryNMonthsDates(
  firstBillingDate: Date,
  occurrences: number,
  monthInterval: number,
): ChargeDate[] {
  return Array.from({ length: occurrences }, (_, i) => {
    const issueDate = addMonths(firstBillingDate, i * monthInterval);
    return createChargeDate(issueDate, i + 1);
  });
}

/**
 * Determina si un cargo está vencido.
 */
export function isChargeOverdue(
  dueDate: Date,
  status: string,
  currentDate: Date = new Date(),
): boolean {
  return status === "PENDING" && isBefore(dueDate, currentDate);
}

/**
 * Mapea un Prisma Charge a la entidad Charge con campos computados.
 * - isOverdue: si está vencido (dueDate < hoy y status === PENDING)
 * - invoicingState: estado visual de facturación
 * - invoiceId: extraído de invoiceLines activas si existe
 * Si el charge incluye el fee (via include), también mapea el objeto fee con id y description.
 */
export function mapChargeToEntity(
  charge: PrismaCharge & {
    fee?: Fee | null;
    invoiceLines?: Array<{ invoiceId: string }>;
  },
  currentDate: Date = new Date(),
): Charge {
  let invoicingState: ChargeInvoicingState;
  if (
    charge.status === ChargeStatus.INVOICED ||
    charge.status === ChargeStatus.PAID
  ) {
    invoicingState = ChargeInvoicingState.INVOICED;
  } else if (charge.status === ChargeStatus.PENDING) {
    invoicingState = isBefore(currentDate, charge.issueDate)
      ? ChargeInvoicingState.PENDING
      : ChargeInvoicingState.REQUIRES_INVOICING;
  } else {
    invoicingState = ChargeInvoicingState.PENDING;
  }
  return {
    ...charge,
    fee: charge.fee
      ? {
          id: charge.fee.id,
          description: charge.fee.description,
        }
      : undefined,
    isOverdue: isChargeOverdue(charge.dueDate, charge.status, currentDate),
    invoiceId: charge.invoiceLines?.[0]?.invoiceId ?? undefined,
    invoicingState,
  };
}
