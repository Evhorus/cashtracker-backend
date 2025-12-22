import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TerminusModule } from '@nestjs/terminus';
import { HealthCheckService } from './health-check.service';
import { HealthCheckController } from './health-check.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthCheckController],
  providers: [HealthCheckService],
})
export class HealthCheckModule {}
