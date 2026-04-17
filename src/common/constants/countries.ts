import { countries as countriesData } from "countries-list";

export interface CountryOption {
  code: string;
  name: string;
}

export const COUNTRIES: CountryOption[] = Object.entries(countriesData)
  .map(([code, data]) => ({ code, name: data.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function isValidCountryCode(code: string): boolean {
  return COUNTRY_CODES.has(code);
}

export function formatCountryDropdownLabel(option: CountryOption): string {
  return `${option.name} (${option.code})`;
}

// Matches `Nombre (XX)` where XX is 2 uppercase letters. Captures the code.
const COUNTRY_DROPDOWN_REGEX = /\(([A-Z]{2})\)\s*$/;

export function parseCountryDropdownLabel(raw: string): string | null {
  const match = raw.trim().match(COUNTRY_DROPDOWN_REGEX);
  if (!match) return null;
  const code = match[1];
  return isValidCountryCode(code) ? code : null;
}
