import 'dotenv/config';
import * as z from 'zod';

const envSchema = z.object({
  PORT: z.preprocess((val) => Number(val), z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  // JSONWEBTOKEN
  JWT_SECRET: z.string(),

  // NODEMAILER
  MAILER_SERVICE: z.string().min(1),
  MAILER_EMAIL: z.string().min(1),
  MAILER_SECRET_KEY: z.string().min(1),

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

  MAILER_SERVICE: envVars.MAILER_SERVICE,
  MAILER_EMAIL: envVars.MAILER_EMAIL,
  MAILER_SECRET_KEY: envVars.MAILER_SECRET_KEY,

  CLIENT_URL: envVars.CLIENT_URL,

  CLOUDINARY_NAME: envVars.CLOUDINARY_NAME,
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET,
};
