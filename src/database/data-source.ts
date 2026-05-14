import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const dbUrl = new URL(process.env.DATABASE_URL as string);
dbUrl.searchParams.set('sslmode', 'verify-full');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl.toString(),
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: true,
  subscribers: [],
  poolSize: 10,
  extra: {
    sslmode: 'verify-full',
    ssl: {
      rejectUnauthorized: false,
    },
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
