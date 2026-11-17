import { checkTestDatabase } from './assert-safe-test-database';

/**
 * A safety guard nobody tests is a safety guard nobody knows still
 * works. The e2e suites DELETE rows between tests, so the only database
 * they may touch is a throwaway one on this machine.
 *
 * Tests the pure decision function, so there is no filesystem to mock -
 * assertSafeTestDatabase() is only the `readFileSync` + `throw` wrapper
 * around it.
 */
describe('checkTestDatabase', () => {
  const LOCAL_TEST = 'postgresql://postgres@127.0.0.1:55432/cashtracker_test';
  const EVERYDAY =
    'postgresql://u:p@ep-young-meadow.aws.neon.tech/neondb?sslmode=require';

  it('accepts a database on this machine', () => {
    expect(checkTestDatabase(LOCAL_TEST, EVERYDAY)).toEqual({ ok: true });
    expect(
      checkTestDatabase('postgresql://postgres@localhost:5432/x', EVERYDAY),
    ).toEqual({ ok: true });
    expect(
      checkTestDatabase('postgresql://postgres@[::1]:5432/x', EVERYDAY),
    ).toEqual({ ok: true });
  });

  it('accepts a local database with nothing to compare against (CI)', () => {
    expect(
      checkTestDatabase(
        'postgresql://postgres@localhost:5432/cashtracker_test',
        null,
      ),
    ).toEqual({ ok: true });
  });

  it('refuses any remote database, even one that differs from .env', () => {
    // Exactly the old setup: .env.test pointed at a second Neon branch.
    // It was "not the everyday database", and the suites still wiped it.
    const result = checkTestDatabase(
      'postgresql://u:p@ep-proud-recipe.aws.neon.tech/neondb?sslmode=require',
      EVERYDAY,
    );

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('not on this machine'),
    );
  });

  it('refuses a remote database even when .env is missing', () => {
    const result = checkTestDatabase('postgresql://u:p@ci-host/anything', null);

    expect(result.ok).toBe(false);
  });

  it('refuses when the target is the everyday database, even if local', () => {
    const local = 'postgresql://postgres@localhost:5432/cashtracker';
    const result = checkTestDatabase(
      'postgresql://other@LOCALHOST:5432/CashTracker?x=1',
      local,
    );

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty(
      'error',
      expect.stringContaining('same database as .env'),
    );
  });

  it('distinguishes local databases that differ only by port', () => {
    expect(
      checkTestDatabase(
        'postgresql://u:p@localhost:5433/app',
        'postgresql://u:p@localhost:5432/app',
      ),
    ).toEqual({ ok: true });
  });

  it('refuses when DATABASE_URL is missing entirely', () => {
    expect(checkTestDatabase(undefined, EVERYDAY)).toHaveProperty(
      'error',
      expect.stringContaining('DATABASE_URL is not set'),
    );
  });

  it('refuses an unparseable DATABASE_URL rather than assuming it is fine', () => {
    expect(checkTestDatabase('not-a-url', EVERYDAY)).toHaveProperty(
      'error',
      expect.stringContaining('could not be parsed'),
    );
  });
});
