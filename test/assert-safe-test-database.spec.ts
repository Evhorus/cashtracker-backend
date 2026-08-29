import { checkTestDatabase } from './assert-safe-test-database';

/**
 * A safety guard nobody tests is a safety guard nobody knows still
 * works. The scenario that matters is the first test: someone points
 * .env.test at the same database the app uses every day.
 *
 * Tests the pure decision function, so there is no filesystem to mock -
 * assertSafeTestDatabase() is only the `readFileSync` + `throw` wrapper
 * around it.
 */
describe('checkTestDatabase', () => {
  const EVERYDAY =
    'postgresql://u:p@ep-young-meadow.aws.neon.tech/neondb?sslmode=require';

  it('refuses when the target is the everyday database', () => {
    const result = checkTestDatabase(EVERYDAY, EVERYDAY);

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('same database as .env'),
    );
  });

  it('refuses even when the URLs differ only cosmetically', () => {
    // Uppercase host, different credentials, different query params -
    // still the same database.
    const result = checkTestDatabase(
      'postgresql://other:creds@EP-YOUNG-MEADOW.AWS.NEON.TECH/NeonDB?channel_binding=require',
      EVERYDAY,
    );

    expect(result.ok).toBe(false);
  });

  it('accepts a different host even when the database name is identical', () => {
    // Exactly this project's setup: two Neon branches, both called
    // "neondb". A name-based rule would have rejected this.
    const result = checkTestDatabase(
      'postgresql://u:p@ep-proud-recipe.aws.neon.tech/neondb?sslmode=require',
      EVERYDAY,
    );

    expect(result).toEqual({ ok: true });
  });

  it('accepts a different database name on the same host', () => {
    const result = checkTestDatabase(
      'postgresql://u:p@ep-young-meadow.aws.neon.tech/neondb_test',
      EVERYDAY,
    );

    expect(result).toEqual({ ok: true });
  });

  it('distinguishes databases that differ only by port', () => {
    const result = checkTestDatabase(
      'postgresql://u:p@localhost:5433/app',
      'postgresql://u:p@localhost:5432/app',
    );

    expect(result).toEqual({ ok: true });
  });

  it('refuses when DATABASE_URL is missing entirely', () => {
    const result = checkTestDatabase(undefined, EVERYDAY);

    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('DATABASE_URL is not set'),
    );
  });

  it('refuses an unparseable DATABASE_URL rather than assuming it is fine', () => {
    const result = checkTestDatabase('not-a-url', EVERYDAY);

    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('could not be parsed'),
    );
  });

  it('warns instead of passing silently when there is nothing to compare against', () => {
    const result = checkTestDatabase('postgresql://u:p@ci-host/anything', null);

    expect(result.ok).toBe(true);
    expect(result).toHaveProperty(
      'warning',
      expect.stringContaining('could not be compared'),
    );
  });
});
