import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Request } from 'express';

import { ExpensesService } from '../expenses.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

@Injectable()
export class ExpenseExistsGuard implements CanActivate {
  constructor(private readonly expensesService: ExpensesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { expenseId } = req.params;
    assertIsUUID(expenseId, 'expenseId');

    const expense = await this.expensesService.findOneInternal(expenseId);

    // Same response for "doesn't exist" and "belongs to a different
    // envelope" - ensures a caller can't enumerate other users' expense IDs
    // by noticing a different status code for each case.
    if (!expense || expense.envelopeId !== req.envelope?.id) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    req.expense = expense;
    return true;
  }
}
