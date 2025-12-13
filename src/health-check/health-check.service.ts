import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { envs } from 'src/config/envs';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly httpService: HttpService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkHealth() {
    try {
      const response$ = this.httpService
        .get(`${envs.API_URL}/health-check`)
        .pipe(
          timeout(5000), // 5 second timeout
          catchError((error) => {
            throw error;
          }),
        );

      const response = await firstValueFrom(response$);
      this.logger.log(`Health check status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
    }
  }
}
