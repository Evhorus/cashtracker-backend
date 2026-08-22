import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('Config');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.url(),
  API_URL: z.url(),
  DATABASE_URL: z.url(),
  CLERK_SECRET_KEY: z.string().min(1),
  // Read directly from process.env by src/database/data-source.ts (which
  // also backs the TypeORM CLI, outside Nest's DI/ConfigService) - included
  // here too so it's validated and documented in one place. Set to 'false'
  // to run migrations as a separate release step instead of on every boot.
  MIGRATIONS_RUN_ON_BOOT: z.enum(['true', 'false']).default('true'),
});

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    logger.error('❌ Invalid environment variables:');
    logger.error(JSON.stringify(result.error.issues, null, 2));
    throw new Error('Invalid environment variables');
  }

  return result.data;
}
