/**
 * class-transformer helpers for query strings, where everything arrives
 * as a string.
 */

/** `?ids=a,b` and `?ids=a&ids=b` both become `['a', 'b']`. */
export function toStringList(value: unknown): unknown {
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value === 'string') return value.split(',').filter(Boolean);
  return value;
}

/** Only `true` / `"true"` is true; `"false"` must not be truthy. */
export function toBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}
