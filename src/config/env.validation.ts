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
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
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
