export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[()\d\s-]+$/;
export const MIN_BIRTH_YEAR = 1900;

export type AddErrorFn = (column: string, message: string) => void;
