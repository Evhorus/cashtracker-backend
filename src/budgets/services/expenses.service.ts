import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async create(budgetId: string, createExpenseDto: CreateExpenseDto) {
    const expense = this.expensesRepository.create(createExpenseDto);

    await this.expensesRepository.save({
      ...expense,
      budgetId,
    });

    await this.recalculateSpent(budgetId);

    return {
      message: 'Gasto creado',
    };
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
    await this.findOne(expenseId);

    await this.expensesRepository.update(expenseId, updateExpenseDto);

    await this.recalculateSpent(budget.id);

    return { message: 'Gasto actualizado' };
  }

  async remove(budget: Budget, expenseId: string) {
    await this.findOne(expenseId);

    await this.expensesRepository.delete({ id: expenseId });

    await this.recalculateSpent(budget.id);

    return { message: 'Gasto eliminado' };
  }

  private async recalculateSpent(budgetId: string): Promise<void> {
    const totalSpent = await this.expensesRepository
      .createQueryBuilder('expense')
      .where('expense.budgetId = :budgetId', { budgetId })
      .select('SUM(expense.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    const spentValue =
      totalSpent && totalSpent.sum ? parseFloat(totalSpent.sum) : 0;

    await this.budgetsRepository.update(budgetId, { spent: spentValue });
  }
}
