import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { envs } from 'src/config/envs';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkHealth() {
    try {
      const response = await fetch(`${envs.API_URL}/health-check`);

      this.logger.log(`Health check status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
    }
  }
}
