/**
 * The only change made to text a user types: spaces trimmed at the
 * start and end of each line, and runs of spaces or tabs inside a line
 * collapsed to one. Casing and line breaks are kept - the app shows
 * text exactly as it was written. (Names used to be lowercased on save
 * and re-capitalised for display, which lost how the user wrote them.)
 */
export const normalizeString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
};
