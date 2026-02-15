import { createClerkClient } from '@clerk/backend';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const ClerkClientProvider: Provider = {
  provide: 'ClerkClient',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      publishableKey: configService.getOrThrow<string>('CLERK_SECRET_KEY'),
      secretKey: configService.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  },
};
