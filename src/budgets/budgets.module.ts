import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BudgetsService } from './services/budgets.service';
import { BudgetsController } from './budgets.controller';
import { Budget } from './entities/budget.entity';
import { Expense } from './entities/expense.entity';
import { ExpensesService } from './services/expenses.service';
import { BudgetsRepository } from './repositories/budgets.repository';
import { ExpensesRepository } from './repositories/expenses.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Expense])],
  controllers: [BudgetsController],
  providers: [
    BudgetsService,
    ExpensesService,
    BudgetsRepository,
    ExpensesRepository,
  ],
})
export class BudgetsModule {}
