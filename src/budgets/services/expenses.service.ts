import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { GetExpensesFilterDto } from '../dto/get-expenses-filter.dto';
import { Budget } from '../entities/budget.entity';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { ExpenseResponseDto } from '../dto/expense-response.dto';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { BudgetsRepository } from '../repositories/budgets.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly budgetsRepository: BudgetsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(budgetId: string, createExpenseDto: CreateExpenseDto) {
    return this.dataSource.transaction(async (manager) => {
      const expense = await this.expensesRepository.create(
        {
          ...createExpenseDto,
          budgetId,
        },
        manager,
      );

      // Incremental update - more efficient than recalculation
      await this.budgetsRepository.incrementSpent(budgetId, expense.amount);

      return {
        message: 'Gasto creado',
      };
    });
  }

  async findAll(budgetId: string, filters: GetExpensesFilterDto) {
    const expenses = await this.expensesRepository.findAll(budgetId, filters);

    return expenses.map((expense) => ExpenseResponseDto.fromEntity(expense));
  }

  async findOne(id: string) {
    const expense = await this.expensesRepository.findById(id);

    if (!expense) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return ExpenseResponseDto.fromEntity(expense);
  }

  /**
   * Internal method for guards - returns Entity
   * Use this for internal validation logic
   */
  async findOneInternal(id: string) {
    const expense = await this.expensesRepository.findById(id);

    if (!expense) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return expense; // Returns Entity for internal use
  }

  async update({
    budget,
    expenseId,
    updateExpenseDto,
  }: {
    budget: Budget;
    expenseId: string;
    updateExpenseDto: UpdateExpenseDto;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const oldExpense = await this.findOneInternal(expenseId);

      await this.expensesRepository.update(
        expenseId,
        updateExpenseDto,
        manager,
      );

      // Calculate difference and update incrementally
      const newAmount = updateExpenseDto.amount ?? oldExpense.amount;
      const difference = newAmount - oldExpense.amount;

      if (difference !== 0) {
        await this.budgetsRepository.incrementSpent(budget.id, difference);
      }

      return { message: 'Gasto actualizado' };
    });
  }

  async remove(budget: Budget, expenseId: string) {
    return this.dataSource.transaction(async (manager) => {
      const expense = await this.findOneInternal(expenseId);

      await this.expensesRepository.delete(expenseId, manager);

      // Decrement spent by expense amount
      await this.budgetsRepository.decrementSpent(budget.id, expense.amount);

      return { message: 'Gasto eliminado' };
    });
  }
}
