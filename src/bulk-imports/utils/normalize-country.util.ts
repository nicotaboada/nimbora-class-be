import {
  parseCountryDropdownLabel,
  isValidCountryCode,
} from "../../common/constants/countries";
import { AddErrorFn } from "./validation-patterns";

export function normalizeCountry(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): string | null {
  if (!raw) return null;
  const parsed = parseCountryDropdownLabel(raw);
  if (parsed) return parsed;
  if (isValidCountryCode(raw)) return raw;
  addError(column, "Valor inválido");
  return null;
}
