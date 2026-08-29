/**
 * Refuses to let the e2e suites run against a database that isn't
 * obviously a throwaway one.
 *
 * The suites wipe tables between tests (`DELETE FROM expense`,
 * `DELETE FROM envelope`). Their only previous protection was
 *
 *     if (process.env.NODE_ENV !== 'test') return;
 *
 * which protects nothing: `pnpm test:e2e` sets NODE_ENV=test, so the
 * check always passes. The one scenario that actually matters - someone
 * creating `.env.test` and pasting the production DATABASE_URL into it,
 * which is the easiest possible mistake to make - sailed straight
 * through and deleted real data.
 *
 * So the requirement is explicit instead: the target database name must
 * look like a test database, or the run aborts before touching anything.
 * Fail closed - a missing or unparseable DATABASE_URL aborts too.
 */

/** Databases whose name matches this are considered safe to wipe. */
const TEST_DATABASE_NAME_PATTERN = /(^|[-_])test([-_]|$)|test$/i;

export function assertSafeTestDatabase(): void {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error(
      'e2e aborted: DATABASE_URL is not set. Create a .env.test pointing at a ' +
        'dedicated test database (it is gitignored). Never reuse the ' +
        'development or production one - these suites DELETE FROM envelope ' +
        'and DELETE FROM expense between tests.',
    );
  }

  let databaseName: string;
  let host: string;
  try {
    const url = new URL(rawUrl);
    databaseName = url.pathname.replace(/^\//, '');
    host = url.hostname;
  } catch {
    throw new Error(
      'e2e aborted: DATABASE_URL could not be parsed, so it cannot be ' +
        'confirmed to point at a test database.',
    );
  }

  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `e2e aborted: refusing to wipe tables in database "${databaseName}" on ` +
        `${host}, whose name does not look like a test database. These suites ` +
        'DELETE FROM envelope and DELETE FROM expense between tests. Point ' +
        '.env.test at a dedicated database whose name contains "test" (e.g. ' +
        'neondb_test), or rename the one you meant to use.',
    );
  }
}
