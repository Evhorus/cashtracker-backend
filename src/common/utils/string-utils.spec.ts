import { normalizeName, normalizeString } from './string-utils';

describe('normalizeString', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeString('  Mercaldas   Store  ')).toBe('Mercaldas Store');
  });

  it('leaves casing untouched', () => {
    expect(normalizeString('MERCALDAS')).toBe('MERCALDAS');
  });

  it('passes non-strings through unchanged', () => {
    expect(normalizeString(undefined)).toBeUndefined();
    expect(normalizeString(42)).toBe(42);
  });
});

describe('normalizeName', () => {
  it('trims, collapses whitespace, and lowercases', () => {
    expect(normalizeName('  MERCALDAS   Store  ')).toBe('mercaldas store');
  });

  it('folds different castings of the same name to the same value', () => {
    expect(normalizeName('Mercaldas')).toBe(normalizeName('MERCALDAS'));
  });

  it('passes non-strings through unchanged', () => {
    expect(normalizeName(undefined)).toBeUndefined();
    expect(normalizeName(42)).toBe(42);
  });
});
