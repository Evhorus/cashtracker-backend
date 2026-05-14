import { User } from '@clerk/backend';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
