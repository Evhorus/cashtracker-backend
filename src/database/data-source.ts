import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Same file selection as app-config.module.ts. This used to be a bare
// `config()`, which always read `.env` - and that was not a cosmetic
// inconsistency, it silently defeated the whole test-environment split:
//
// DatabaseModule does TypeOrmModule.forRoot(dataSourceOptions), so this
// module is evaluated when the module graph is *imported*, long before
// Nest initializes the ConfigModule that honours `.env.test`. dotenv
// never overwrites an already-set variable, so whatever landed in
// process.env here won permanently. The result: `pnpm test:e2e` built
// its connection from `.env` and connected to the development (in this
// project, production) database, while ConfigModule's `.env.test`
// affected only which values got *validated*. The e2e suites then ran
// their own `DELETE FROM envelope` / `DELETE FROM expense` against it.
const envFilePath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: envFilePath });

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL is not set (loaded ${envFilePath}). ` +
      (process.env.NODE_ENV === 'test'
        ? 'Create a .env.test pointing at a DEDICATED test database - the e2e ' +
          'suites delete rows between tests. It is gitignored.'
        : 'Copy .env.template to .env and fill it in.'),
  );
}

const dbUrl = new URL(process.env.DATABASE_URL);

// Only fill in a default sslmode when the connection string doesn't already
// specify one - never clobber an explicit choice. Production defaults to
// strict certificate verification (for managed providers like Neon/RDS);
// anything else defaults to no TLS, matching a local/dev Postgres (e.g.
// docker-compose) that typically has no cert configured at all.
//
// Previously this unconditionally forced `sslmode=verify-full` here *and*
// passed `extra.ssl.rejectUnauthorized: false` below - a self-contradiction.
// pg's own connection-string parsing runs after `extra` is merged in and
// overwrites it, so verify-full always won and the `extra.ssl` block never
// actually took effect; it just misleadingly suggested verification was
// off. Removed rather than fixed in place, since it did nothing.
const currentSslMode = dbUrl.searchParams.get('sslmode');

// pg-connection-string currently treats 'require'/'prefer'/'verify-ca' as
// plain aliases for 'verify-full' (hence the "SECURITY WARNING... treated
// as aliases" log line - it's not an error, just a heads-up that this
// aliasing is deprecated and may not hold in a future version). Neon's
// connection strings default to `?sslmode=require`, so in production make
// the actual intent explicit instead of depending on that aliasing to keep
// meaning "verified" - an explicit 'disable' or 'verify-full' is left as-is.
const WEAK_SSL_ALIASES = new Set(['require', 'prefer', 'verify-ca']);

if (!currentSslMode) {
  dbUrl.searchParams.set('sslmode', isProduction ? 'verify-full' : 'disable');
} else if (isProduction && WEAK_SSL_ALIASES.has(currentSslMode)) {
  dbUrl.searchParams.set('sslmode', 'verify-full');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl.toString(),
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Runs on every boot by default (fine for a single instance). Set
  // MIGRATIONS_RUN_ON_BOOT=false and run `pnpm migration run` as a separate
  // release step once this scales past one replica, so concurrently
  // booting containers don't race to apply the same migration.
  //
  // Note this also applies under NODE_ENV=test, which is what gets the
  // e2e database its schema - intended, and safe now that the env file
  // above actually decides which database that is. Before that fix,
  // booting the e2e suite applied pending migrations to whatever `.env`
  // pointed at.
  migrationsRun: process.env.MIGRATIONS_RUN_ON_BOOT !== 'false',
  subscribers: [],
  poolSize: 10,
};

export const AppDataSource = new DataSource(dataSourceOptions);
