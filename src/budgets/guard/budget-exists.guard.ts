import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { Budget } from '../entities/budget.entity';
import { BudgetsService } from '../budgets.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';

declare module 'express' {
  interface Request {
    budget?: Budget;
  }
}

@Injectable()
export class BudgetExistsGuard implements CanActivate {
  constructor(private readonly budgetsService: BudgetsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { budgetId } = req.params;
    assertIsUUID(budgetId, 'budgetId');

    const budget = await this.budgetsService.findOne(budgetId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.userId !== req.user?.id) {
      throw new UnauthorizedException('You do not own this budget');
    }

    req.budget = budget;
    return true;
  }
}
