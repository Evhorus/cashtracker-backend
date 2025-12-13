import { applyDecorators, UseGuards } from '@nestjs/common';
import { BudgetExistsGuard } from '../guard/budget-exists.guard';

export function BudgetExists() {
  return applyDecorators(UseGuards(BudgetExistsGuard));
}
