import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

const KEEP_ALIVE_TIMEOUT_MS = 5000;

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Keep-alive ping to prevent Render from hibernating the server.
   * Runs every 5 minutes (Render free tier suspends after ~15 minutes of
   * inactivity) and requests the app's own public URL so it registers as
   * inbound traffic. Uses Node's built-in fetch, so no HTTP client
   * dependency is needed for this one call.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    const url = `${this.configService.getOrThrow<string>('API_URL')}/health-check`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(KEEP_ALIVE_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      this.logger.log('✓ Self HTTP ping successful');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `✗ Keep-alive ping failed: ${errorMessage}`,
        errorStack,
      );
    }
  }
}
