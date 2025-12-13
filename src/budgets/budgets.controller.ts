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
} from '@nestjs/common';
import { BudgetsService } from './services/budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './services/expenses.service';
import type { Request } from 'express';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { BudgetExists } from './decorators/budget-exists.decorator';
import { ExpenseExists } from './decorators/expense-exists.decorator';

@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly expensesService: ExpensesService,
  ) {}

  /**
   * Routes for Budgets
   */

  @Post()
  createBudget(
    @Body() createBudgetDto: CreateBudgetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    // Use light query for list view (no expenses)
    return this.budgetsService.findAllLight(userId);
  }

  @BudgetExists()
  @Get(':budgetId')
  findBudget(@Param('budgetId') budgetId: string) {
    return this.budgetsService.findOnePlain(budgetId);
  }

  @BudgetExists()
  @Patch(':budgetId')
  updateBudget(
    @Param('budgetId') budgetId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(budgetId, updateBudgetDto);
  }

  @BudgetExists()
  @Delete(':budgetId')
  remove(@Param('budgetId') id: string) {
    return this.budgetsService.remove(id);
  }

  /**
   * Routes for Expense
   */

  @BudgetExists()
  @Post(':budgetId/expenses')
  createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    const budgetId = req.budget?.id;
    if (!budgetId) {
      throw new BadRequestException('Check ValidateBudgetExistsMiddleware');
    }
    return this.expensesService.create(budgetId, createExpenseDto);
  }

  @ExpenseExists()
  @BudgetExists()
  @Get(':budgetId/expenses/:expenseId')
  findExpense(@Param('expenseId', ParseUUIDPipe) expenseId: string) {
    return this.expensesService.findOne(expenseId);
  }

  @ExpenseExists()
  @BudgetExists()
  @Patch(':budgetId/expenses/:expenseId')
  updateExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: Request,
  ) {
    const budget = req.budget;
    if (!budget) {
      throw new BadRequestException('Check ValidateBudgetExistsMiddleware');
    }
    return this.expensesService.update({ budget, expenseId, updateExpenseDto });
  }

  @ExpenseExists()
  @BudgetExists()
  @Delete(':budgetId/expenses/:expenseId')
  deleteExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Req() req: Request,
  ) {
    const budget = req.budget;
    if (!budget) {
      throw new BadRequestException('Check ValidateBudgetExistsMiddleware');
    }
    return this.expensesService.remove(budget, expenseId);
  }
}
