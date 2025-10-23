import { createClerkClient } from '@clerk/backend';
import { envs } from 'src/config/envs';

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: () => {
    return createClerkClient({
      publishableKey: envs.CLERK_PUBLISHABLE_KEY,
      secretKey: envs.CLERK_SECRET_KEY,
    });
  },
};
