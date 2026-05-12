import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { GetExpensesFilterDto } from './dto/get-expenses-filter.dto';
import type { Request } from 'express';
import { BudgetExists } from '../budgets/decorators/budget-exists.decorator';
import { ExpenseExists } from './decorators/expense-exists.decorator';
import { ExpensesService } from './expenses.service';

@Controller('budgets/:budgetId/expenses')
@BudgetExists() // All routes here require the budget to exist and belong to the user
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    const budgetId = req.budget?.id;
    if (!budgetId) {
      throw new BadRequestException('Budget not found in request');
    }
    return this.expensesService.create(budgetId, createExpenseDto);
  }

  @Get()
  findAllExpenses(
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Query() filters: GetExpensesFilterDto,
  ) {
    return this.expensesService.findAll(budgetId, filters);
  }

  @ExpenseExists()
  @Get(':expenseId')
  findExpense(@Param('expenseId', ParseUUIDPipe) expenseId: string) {
    return this.expensesService.findOne(expenseId);
  }

  @ExpenseExists()
  @Patch(':expenseId')
  updateExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: Request,
  ) {
    const budget = req.budget;
    if (!budget) {
      throw new BadRequestException('Budget not found in request');
    }
    return this.expensesService.update({ budget, expenseId, updateExpenseDto });
  }

  @ExpenseExists()
  @Delete(':expenseId')
  deleteExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Req() req: Request,
  ) {
    const budget = req.budget;
    if (!budget) {
      throw new BadRequestException('Budget not found in request');
    }
    return this.expensesService.remove(budget, expenseId);
  }
}
