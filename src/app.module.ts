import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BudgetsModule } from './budgets/budgets.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    BudgetsModule,
    HealthCheckModule,
    AuthModule,
  ],
})
export class AppModule {}
