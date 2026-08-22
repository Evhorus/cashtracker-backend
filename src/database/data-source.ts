import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const isProduction = process.env.NODE_ENV === 'production';

const dbUrl = new URL(process.env.DATABASE_URL as string);

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
  migrationsRun: process.env.MIGRATIONS_RUN_ON_BOOT !== 'false',
  subscribers: [],
  poolSize: 10,
};

export const AppDataSource = new DataSource(dataSourceOptions);
