import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { Expense } from '../entities/expense.entity';
import { Budget } from '../entities/budget.entity';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    private readonly dataSource: DataSource,
  ) {}

  async create(budgetId: string, createExpenseDto: CreateExpenseDto) {
    return this.dataSource.transaction(async (manager) => {
      const expense = manager.create(Expense, {
        ...createExpenseDto,
        budgetId,
      });

      await manager.save(expense);

      // Incremental update - more efficient than recalculation
      await manager.increment(
        Budget,
        { id: budgetId },
        'spent',
        expense.amount,
      );

      return {
        message: 'Gasto creado',
      };
    });
  }

  async findOne(id: string) {
    const expense = await this.expensesRepository.findOneBy({ id });

    if (!expense) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return expense;
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
      const oldExpense = await this.findOne(expenseId);

      await manager.update(Expense, expenseId, updateExpenseDto);

      // Calculate difference and update incrementally
      const newAmount = updateExpenseDto.amount ?? oldExpense.amount;
      const difference = newAmount - oldExpense.amount;

      if (difference !== 0) {
        await manager.increment(Budget, { id: budget.id }, 'spent', difference);
      }

      return { message: 'Gasto actualizado' };
    });
  }

  async remove(budget: Budget, expenseId: string) {
    return this.dataSource.transaction(async (manager) => {
      const expense = await this.findOne(expenseId);

      await manager.delete(Expense, { id: expenseId });

      // Decrement spent by expense amount
      await manager.decrement(
        Budget,
        { id: budget.id },
        'spent',
        expense.amount,
      );

      return { message: 'Gasto eliminado' };
    });
  }
}
