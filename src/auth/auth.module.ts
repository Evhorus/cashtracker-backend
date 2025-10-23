import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClerkClientProvider } from 'src/auth/providers/clerk-client.provider';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Module({
  imports: [PassportModule],
  providers: [
    ClerkStrategy,
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
  exports: [PassportModule],
})
export class AuthModule {}
