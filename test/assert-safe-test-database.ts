import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Refuses to let the e2e suites run against the database the app
 * normally uses.
 *
 * The suites wipe tables between tests (`DELETE FROM expense`,
 * `DELETE FROM envelope`). Their only previous protection was
 *
 *     if (process.env.NODE_ENV !== 'test') return;
 *
 * which protects nothing: `pnpm test:e2e` sets NODE_ENV=test, so the
 * check always passed. The realistic mistake - pasting the everyday
 * connection string into `.env.test` - sailed straight through.
 *
 * So the check compares the target against whatever `.env` points at and
 * aborts when they are the same database. That is a stronger test than
 * looking for "test" in the name, and it does not dictate how databases
 * are named: hosted Postgres (Neon, Supabase, RDS) typically leaves every
 * branch or project's database called the same thing, so a name-based
 * rule rejects perfectly good test databases while a URL comparison
 * catches the case that actually destroys data.
 *
 * Fails closed: a missing DATABASE_URL, or one that can't be parsed,
 * aborts too.
 *
 * `checkTestDatabase` below is the whole decision as a pure function, so
 * it can be tested without mocking the filesystem;
 * `assertSafeTestDatabase` is the thin wrapper that does the I/O.
 */

interface DatabaseIdentity {
  host: string;
  port: string;
  name: string;
}

export type TestDatabaseCheck =
  { ok: true; warning?: string } | { ok: false; error: string };

function identify(rawUrl: string): DatabaseIdentity | null {
  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname.toLowerCase(),
      port: url.port,
      name: url.pathname.replace(/^\//, '').toLowerCase(),
    };
  } catch {
    return null;
  }
}

function sameDatabase(a: DatabaseIdentity, b: DatabaseIdentity): boolean {
  return a.host === b.host && a.port === b.port && a.name === b.name;
}

/**
 * @param targetUrl the DATABASE_URL the e2e run would connect to
 * @param everydayUrl DATABASE_URL from `.env`, or null when there is none
 *   to compare against (CI, or a fresh checkout)
 */
export function checkTestDatabase(
  targetUrl: string | undefined,
  everydayUrl: string | null,
): TestDatabaseCheck {
  if (!targetUrl) {
    return {
      ok: false,
      error:
        'e2e aborted: DATABASE_URL is not set. Create a .env.test pointing at ' +
        'a DEDICATED test database (it is gitignored). These suites DELETE ' +
        'FROM envelope and DELETE FROM expense between tests.',
    };
  }

  const target = identify(targetUrl);
  if (!target) {
    return {
      ok: false,
      error:
        'e2e aborted: DATABASE_URL could not be parsed, so it cannot be ' +
        'confirmed to differ from the everyday database.',
    };
  }

  const everyday = everydayUrl ? identify(everydayUrl) : null;

  if (everyday && sameDatabase(target, everyday)) {
    return {
      ok: false,
      error:
        `e2e aborted: .env.test points at the same database as .env ` +
        `(${target.name} on ${target.host}). These suites DELETE FROM ` +
        'envelope and DELETE FROM expense between tests, so this would ' +
        'destroy real data. Point .env.test at a separate database - a ' +
        'different Neon branch or project is enough; the name may stay the ' +
        'same.',
    };
  }

  if (!everydayUrl) {
    // Nothing to compare against. Not fatal - CI is expected to provide a
    // throwaway database - but say so, because the guard verified nothing.
    return {
      ok: true,
      warning:
        '[e2e] No .env DATABASE_URL found, so the target database could not ' +
        'be compared against the everyday one. Make sure DATABASE_URL is a ' +
        'throwaway database: these suites delete rows between tests.',
    };
  }

  return { ok: true };
}

/** Reads DATABASE_URL straight out of a dotenv file, without loading it
 * into process.env - this only needs to compare, never to connect. */
function databaseUrlFromEnvFile(file: string): string | null {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return null;

  const match = readFileSync(path, 'utf8').match(/^\s*DATABASE_URL\s*=(.*)$/m);
  if (!match) return null;

  return match[1].trim().replace(/^["']|["']$/g, '') || null;
}

export function assertSafeTestDatabase(): void {
  const result = checkTestDatabase(
    process.env.DATABASE_URL,
    databaseUrlFromEnvFile('.env'),
  );

  if (!result.ok) throw new Error(result.error);
  if (result.warning) console.warn(result.warning);
}
