import { applyDecorators, UseGuards } from '@nestjs/common';
import { ExpenseExistsGuard } from '../guards/expense-exists.guard';

export function ExpenseExists() {
  return applyDecorators(UseGuards(ExpenseExistsGuard));
}
