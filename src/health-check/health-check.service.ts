import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Keep-alive ping to prevent Render from hibernating the server
   * Runs every 5 minutes (Render free tier suspends after ~15 minutes of inactivity)
   * This reduces DB load while ensuring the server never reaches the suspension threshold
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    try {
      // Direct DB ping - more efficient than HTTP request
      await this.dataSource.query('SELECT 1');
      this.logger.log('✓ Keep-alive ping successful - Server staying active');
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
