import { rateLimit } from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { error: 'You have reached the request limit' },
});
