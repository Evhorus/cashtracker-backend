import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('4000'),

  // URLs
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  API_URL: z.string().url('API_URL must be a valid URL'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth (Clerk)
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    console.error(
      '\n💡 Check your .env file and ensure all required variables are set.',
    );
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
  return result.data;
}
