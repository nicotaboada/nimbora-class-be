import { AddErrorFn, EMAIL_REGEX } from "./validation-patterns";

export function normalizeEmail(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): string | null {
  if (!raw) return null;
  if (EMAIL_REGEX.test(raw)) return raw.toLowerCase();
  addError(column, "Formato inválido");
  return null;
}
