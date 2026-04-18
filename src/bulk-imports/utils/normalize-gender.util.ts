import { parseGenderLabel } from "../../common/constants/genders";
import { Gender } from "../../common/enums";
import { AddErrorFn } from "./validation-patterns";

export function normalizeGender(
  raw: string | null,
  column: string,
  addError: AddErrorFn,
): Gender | null {
  if (!raw) return null;
  const parsed = parseGenderLabel(raw);
  if (parsed) return parsed;
  addError(column, "Valor inválido");
  return null;
}
