import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

import { ExpensesService } from '../expenses.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';

@Injectable()
export class ExpenseExistsGuard implements CanActivate {
  constructor(private readonly expensesService: ExpensesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { expenseId } = req.params;
    assertIsUUID(expenseId, 'expenseId');

    const expense = await this.expensesService.findOneInternal(expenseId);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Security check: ensure expense belongs to the budget being accessed
    if (expense.budgetId !== req.budget?.id) {
      throw new UnauthorizedException(
        'This expense does not belong to the current budget',
      );
    }

    req.expense = expense;
    return true;
  }
}
