#!/usr/bin/env node
/**
 * Logical backup of the connected Postgres database before a
 * schema-altering migration (pg_dump is not available in this
 * environment, so this reproduces the essentials with the `pg` driver
 * that's already a project dependency):
 *  - full row data for every table in the `public` schema, as JSON
 *    (safe to restore programmatically or inspect by hand)
 *  - column definitions (name/type/nullable/default) for every table
 *  - row counts, logged to stdout for a quick sanity check
 *
 * Output: backups/backup-<timestamp>.json (gitignored, never committed)
 */
const { Client } = require("pg");
const { writeFileSync } = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  // Respect an explicit sslmode already in DATABASE_URL; only default to
  // strict verification when none was given. Mirrors src/database/data-source.ts -
  // previously this forced verify-full *and* passed rejectUnauthorized:
  // false, which never took effect (see that file's comment for why) and
  // just made the actual TLS behavior harder to reason about.
  if (!dbUrl.searchParams.has("sslmode")) {
    dbUrl.searchParams.set("sslmode", "verify-full");
  }

  const client = new Client({
    connectionString: dbUrl.toString(),
  });

  await client.connect();

  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const backup = { generatedAt: new Date().toISOString(), tables: {} };

  for (const { table_name } of tables) {
    const { rows: columns } = await client.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
      [table_name],
    );

    const { rows: data } = await client.query(
      `SELECT * FROM "${table_name}"`,
    );

    backup.tables[table_name] = { columns, rowCount: data.length, data };
    console.log(`  ${table_name}: ${data.length} rows`);
  }

  await client.end();

  const outDir = path.join(__dirname, "..", "backups");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `backup-${timestamp}.json`);
  // Full row data for every table, in plaintext - restrict to the owner
  // only rather than leaving it at the default umask-derived permissions.
  writeFileSync(outFile, JSON.stringify(backup, null, 2), { mode: 0o600 });

  console.log(`\nBackup written to ${outFile}`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
