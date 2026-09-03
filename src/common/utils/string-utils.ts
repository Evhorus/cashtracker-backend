/**
 * Normalizes a string by trimming whitespace and replacing multiple spaces with a single one.
 */
export const normalizeString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  return value.trim().replace(/\s+/g, ' ');
};

/**
 * `normalizeString` plus lowercasing - for fields that identify a
 * recurring "thing" by name (an envelope, an expense's merchant) rather
 * than free text a user is writing for themselves. "Mercaldas" and
 * "MERCALDAS" are the same merchant; keeping the stored casing
 * inconsistent fragments dashboard grouping (see
 * `dashboard.repository.ts`'s `getNameBreakdown`) and just looks wrong
 * in a plain list. Not used for `description` or a category's `label`
 * - those are free text/display labels a user typed on purpose, not an
 * identifier meant to be matched against itself.
 */
export const normalizeName = (value: unknown): unknown => {
  const normalized = normalizeString(value);
  return typeof normalized === 'string' ? normalized.toLowerCase() : normalized;
};
