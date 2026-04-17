import { countries as countriesData } from "countries-list";

export interface PhoneCodeOption {
  code: string; // e.g. "+54"
  countryCode: string; // ISO-2, e.g. "AR"
  countryName: string;
}

const rawOptions: PhoneCodeOption[] = Object.entries(countriesData).flatMap(
  ([countryCode, data]) =>
    data.phone.map((p) => ({
      code: `+${p}`,
      countryCode,
      countryName: data.name,
    })),
);

export const PHONE_CODES: PhoneCodeOption[] = rawOptions.sort((a, b) =>
  a.countryName.localeCompare(b.countryName),
);

const VALID_PHONE_CODES = new Set(PHONE_CODES.map((p) => p.code));

export function isValidPhoneCode(code: string): boolean {
  return VALID_PHONE_CODES.has(code);
}

export function formatPhoneCodeDropdownLabel(option: PhoneCodeOption): string {
  return `${option.countryName} (${option.code})`;
}

// Matches `Nombre (+XX)` where +XX is the phone code. Captures the code with +.
const PHONE_DROPDOWN_REGEX = /\((\+\d{1,4})\)\s*$/;

export function parsePhoneCodeDropdownLabel(raw: string): string | null {
  const match = raw.trim().match(PHONE_DROPDOWN_REGEX);
  if (!match) return null;
  const code = match[1];
  return isValidPhoneCode(code) ? code : null;
}
