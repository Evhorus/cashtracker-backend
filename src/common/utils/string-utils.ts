/**
 * Normalizes a string by trimming whitespace and replacing multiple spaces with a single one.
 */
export const normalizeString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  return value.trim().replace(/\s+/g, ' ');
};
