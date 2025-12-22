import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { firstValueFrom } from 'rxjs';
import { envs } from 'src/config/envs';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Keep-alive ping to prevent Render from hibernating the server
   * Runs every 5 minutes (Render free tier suspends after ~15 minutes of inactivity)
   * Strategy: DB ping + Self HTTP request to simulate inbound traffic
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    try {
      // 1. Database ping - keeps DB connection alive
      await this.dataSource.query('SELECT 1');
      this.logger.log('✓ Database ping successful');

      // 2. Self HTTP ping - attempt to register as inbound traffic for Render
      const url = `${envs.API_URL}/health-check`;

      await firstValueFrom(this.httpService.get(url, { timeout: 5000 }));

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
