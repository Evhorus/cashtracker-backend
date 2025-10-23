import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BudgetsService } from '../services/budgets.service';
import { Request } from 'express';
import { Budget } from '../entities/budget.entity';
import { isUUID } from 'class-validator';

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
    const budgetId = req.params.budgetId;

    if (!isUUID(budgetId)) {
      throw new BadRequestException('Invalid UUID format');
    }

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
