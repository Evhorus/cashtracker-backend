import 'dotenv/config';
import * as z from 'zod';

const envSchema = z.object({
  PORT: z.preprocess((val) => Number(val), z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']),

  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().min(1),
  API_URL: z.string().min(1),

  CLOUDINARY_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(`Config validation error: ${parsedEnv.error.message}`);
}

const envVars = parsedEnv.data;

export const envs = {
  PORT: envVars.PORT,
  NODE_ENV: envVars.NODE_ENV,

  DATABASE_URL: envVars.DATABASE_URL,

  CLIENT_URL: envVars.CLIENT_URL,
  API_URL: envVars.API_URL,

  CLERK_PUBLISHABLE_KEY: envVars.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: envVars.CLERK_SECRET_KEY,

  CLOUDINARY_NAME: envVars.CLOUDINARY_NAME,
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET,
};
