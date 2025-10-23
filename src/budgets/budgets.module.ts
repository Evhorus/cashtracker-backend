import { Module } from '@nestjs/common';
import { BudgetsService } from './services/budgets.service';
import { BudgetsController } from './budgets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './entities/budget.entity';
import { Expense } from './entities/expense.entity';
import { ExpensesService } from './services/expenses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Expense])],
  controllers: [BudgetsController],
  providers: [BudgetsService, ExpensesService],
})
export class BudgetsModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(ValidateBudgetExistsMiddleware).forRoutes({
  //     path: 'budgets/:budgetId/*path',
  //     method: RequestMethod.ALL,
  //   });
  //   consumer
  //     .apply(
  //       ValidateBudgetExistsMiddleware,
  //       ValidateExpenseBelongsToBudgetMiddleware,
  //     )
  //     .forRoutes({
  //       path: 'budgets/:budgetId/expenses/:expenseId/*path',
  //       method: RequestMethod.ALL,
  //     });
  // }
}
