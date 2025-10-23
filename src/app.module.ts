import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './config/envs';
import { BudgetsModule } from './budgets/budgets.module';
import { Budget } from './budgets/entities/budget.entity';
import { Expense } from './budgets/entities/expense.entity';
import { HealthCheckModule } from './health-check/health-check.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: envs.DATABASE_URL,
      synchronize: envs.NODE_ENV === 'development',
      entities: [Budget, Expense],
    }),
    BudgetsModule,
    HealthCheckModule,
    AuthModule,
  ],
})
export class AppModule {}
