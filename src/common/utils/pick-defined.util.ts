/**
 * Filters out undefined values from an object.
 * Useful for building Prisma update objects where undefined fields should not be updated.
 *
 * @example
 * const input = { firstName: 'John', lastName: undefined, email: 'john@example.com' };
 * const updateData = pickDefined(input);
 * // Result: { firstName: 'John', email: 'john@example.com' }
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
