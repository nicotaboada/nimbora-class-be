import {
  parsePhoneCodeDropdownLabel,
  isValidPhoneCode,
} from "../../common/constants/phone-codes";
import { AddErrorFn, PHONE_REGEX } from "./validation-patterns";

export function normalizePhoneCountryCode(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): string | null {
  if (!raw) return null;
  const parsed = parsePhoneCodeDropdownLabel(raw);
  if (parsed) return parsed;
  if (raw.startsWith("+") && isValidPhoneCode(raw)) return raw;
  addError(column, "Valor inválido");
  return null;
}

export function normalizePhoneNumber(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): string | null {
  if (!raw) return null;
  if (raw.includes("+")) {
    addError(
      column,
      "Solo números (el código de país va en la columna 'Código país teléfono')",
    );
    return null;
  }
  if (PHONE_REGEX.test(raw)) return raw.replaceAll(/[\s()-]/g, "");
  addError(column, "Solo se permiten números");
  return null;
}
