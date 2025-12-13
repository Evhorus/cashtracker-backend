import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from '../config/envs';
import { Budget } from '../budgets/entities/budget.entity';
import { Expense } from '../budgets/entities/expense.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: envs.DATABASE_URL,
      synchronize: envs.NODE_ENV === 'development',
      entities: [Budget, Expense],
      logging: envs.NODE_ENV === 'development',
    }),
  ],
})
export class DatabaseModule {}
