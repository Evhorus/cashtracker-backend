import { assertSafeTestDatabase } from './assert-safe-test-database';

/**
 * A safety guard nobody tests is a safety guard nobody knows still
 * works. The scenario that matters is the first test below: someone
 * creates .env.test and pastes the production connection string into it.
 */
describe('assertSafeTestDatabase', () => {
  const originalUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
  });

  it('refuses a production-looking database name', () => {
    // This project's real database is literally called "neondb".
    process.env.DATABASE_URL =
      'postgresql://u:p@ep-proud-recipe.aws.neon.tech/neondb?sslmode=require';

    expect(() => assertSafeTestDatabase()).toThrow(/refusing to wipe tables/);
    expect(() => assertSafeTestDatabase()).toThrow(/neondb/);
  });

  it('refuses when DATABASE_URL is missing entirely', () => {
    delete process.env.DATABASE_URL;

    expect(() => assertSafeTestDatabase()).toThrow(/DATABASE_URL is not set/);
  });

  it('refuses an unparseable DATABASE_URL rather than assuming it is fine', () => {
    process.env.DATABASE_URL = 'not-a-url';

    expect(() => assertSafeTestDatabase()).toThrow(/could not be parsed/);
  });

  it.each([
    'postgresql://u:p@host/neondb_test',
    'postgresql://u:p@host/cashtracker_test',
    'postgresql://u:p@host/cashtracker-test',
    'postgresql://u:p@host/test',
    'postgresql://u:p@host/test_db?sslmode=require',
  ])('accepts a test database name (%s)', (url) => {
    process.env.DATABASE_URL = url;

    expect(() => assertSafeTestDatabase()).not.toThrow();
  });

  it.each([
    'postgresql://u:p@host/production',
    'postgresql://u:p@host/cashtracker',
    'postgresql://u:p@host/main',
  ])('refuses anything else (%s)', (url) => {
    process.env.DATABASE_URL = url;

    expect(() => assertSafeTestDatabase()).toThrow(/refusing to wipe tables/);
  });
});
