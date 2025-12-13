import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Keep-alive ping to prevent Render from hibernating the server
   * Runs every 30 seconds to maintain activity
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async keepAlive() {
    try {
      // Direct DB ping - more efficient than HTTP request
      await this.dataSource.query('SELECT 1');
      this.logger.debug('Keep-alive ping successful');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Keep-alive ping failed: ${errorMessage}`, errorStack);
    }
  }
}
