import { AddErrorFn, MIN_BIRTH_YEAR } from "./validation-patterns";

/** Parse DD/MM/YYYY into a Date at UTC midnight, or null if malformed. */
function parseDateDDMMYYYY(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function normalizeBirthDate(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): Date | null {
  if (!raw) return null;
  const parsed = parseDateDDMMYYYY(raw);
  if (!parsed) {
    addError(column, "Formato inválido, usar DD/MM/AAAA");
    return null;
  }
  if (parsed > new Date()) {
    addError(column, "La fecha no puede ser futura");
    return null;
  }
  if (parsed.getUTCFullYear() < MIN_BIRTH_YEAR) {
    addError(column, `El año no puede ser anterior a ${MIN_BIRTH_YEAR}`);
    return null;
  }
  return parsed;
}
