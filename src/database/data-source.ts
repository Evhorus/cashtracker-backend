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
if (!dbUrl.searchParams.has('sslmode')) {
  dbUrl.searchParams.set('sslmode', isProduction ? 'verify-full' : 'disable');
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
