import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/app-config.module';

import { EnvelopesModule } from './envelopes/envelopes.module';
import { HealthCheckModule } from './health-check/health-check.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';

import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    EnvelopesModule,
    ExpensesModule,
    DashboardModule,
    CategoriesModule,
    PaymentMethodsModule,
    HealthCheckModule,
    AuthModule,
  ],
})
export class AppModule {}
