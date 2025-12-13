import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { Expense } from '../entities/expense.entity';
import { Budget } from '../entities/budget.entity';
import { UpdateExpenseDto } from '../dto/update-expense.dto';

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
      await this.recalculateSpent(budgetId, manager);

      return {
        message: 'Gasto creado',
      };
    });
  }

  async findOne(id: string) {
    const expense = await this.expensesRepository.findOneBy({ id });

    if (!expense) {
      throw new NotFoundException('El gasto no fue encontrado');
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
      await this.findOne(expenseId);

      await manager.update(Expense, expenseId, updateExpenseDto);
      await this.recalculateSpent(budget.id, manager);

      return { message: 'Gasto actualizado' };
    });
  }

  async remove(budget: Budget, expenseId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.findOne(expenseId);

      await manager.delete(Expense, { id: expenseId });
      await this.recalculateSpent(budget.id, manager);

      return { message: 'Gasto eliminado' };
    });
  }

  private async recalculateSpent(
    budgetId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Expense)
      : this.expensesRepository;

    const totalSpent = await repo
      .createQueryBuilder('expense')
      .where('expense.budgetId = :budgetId', { budgetId })
      .select('SUM(expense.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    const spentValue =
      totalSpent && totalSpent.sum ? parseFloat(totalSpent.sum) : 0;

    const budgetRepo = manager
      ? manager.getRepository(Budget)
      : this.budgetsRepository;

    await budgetRepo.update(budgetId, { spent: spentValue });
  }
}
