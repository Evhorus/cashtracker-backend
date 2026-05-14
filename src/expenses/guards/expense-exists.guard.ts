import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

import { Expense } from '../entities/expense.entity';
import { isUUID } from 'class-validator';
import { ExpensesService } from '../expenses.service';

declare module 'express' {
  interface Request {
    expense?: Expense;
  }
}

@Injectable()
export class ExpenseExistsGuard implements CanActivate {
  constructor(private readonly expensesService: ExpensesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { expenseId } = req.params;

    if (typeof expenseId !== 'string') {
      throw new BadRequestException('expenseId must be a string');
    }

    if (!isUUID(expenseId)) {
      throw new BadRequestException('Invalid UUID format');
    }

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
