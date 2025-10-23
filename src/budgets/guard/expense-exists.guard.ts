import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { ExpensesService } from '../services/expenses.service';
import { Expense } from '../entities/expense.entity';
import { isUUID } from 'class-validator';

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
    const expenseId = req.params.expenseId;

    if (!isUUID(expenseId)) {
      throw new BadRequestException('Invalid UUID format');
    }

    const expense = await this.expensesService.findOne(expenseId);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.budgetId !== req.budget?.id) {
      throw new UnauthorizedException('You do not own this expense');
    }

    req.expense = expense;
    return true;
  }
}
