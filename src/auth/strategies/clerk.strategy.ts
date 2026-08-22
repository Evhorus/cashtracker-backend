import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { verifyToken } from '@clerk/backend';
import { Strategy } from 'passport-custom';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  private readonly logger = new Logger(ClerkStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async validate(req: Request): Promise<AuthUser> {
    const token = req.headers.authorization?.split(' ').pop();

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>('CLERK_SECRET_KEY'),
      });

      // Return the payload which contains 'sub' (userId) and other claims.
      // This avoids a network call to Clerk on every request.
      return {
        id: payload.sub,
        ...payload,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Invalid Clerk token: ${errorMessage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
