import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';

import { BudgetsModule } from './budgets/budgets.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 60, // 60 requests per minute
      },
    ]),
    DatabaseModule,
    BudgetsModule,
    ExpensesModule,
    HealthCheckModule,
    AuthModule,
  ],
})
export class AppModule {}
