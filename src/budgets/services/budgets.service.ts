import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { Budget } from '../entities/budget.entity';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
  ) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    const budget = this.budgetsRepository.create(createBudgetDto);
    await this.budgetsRepository.save({ ...budget, spent: 0, userId });

    return {
      message: 'Presupuesto creado',
    };
  }

  /**
   * Find all budgets without expenses (light query for list view)
   * More efficient than findAll when expenses are not needed
   */
  async findAllLight(userId: string) {
    const [budgets, count] = await this.budgetsRepository.findAndCount({
      where: { userId },
      select: [
        'id',
        'name',
        'amount',
        'spent',
        'category',
        'description',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });

    return {
      count,
      data: budgets,
    };
  }

  /**
   * Find all budgets with expenses (full query for detail view)
   * Use this when you need expense data
   */
  async findAll(userId: string) {
    const [budgets, count] = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.expenses', 'expense')
      .where('budget.userId = :userId', { userId })
      .orderBy('budget.createdAt', 'DESC')
      .getManyAndCount();

    return {
      count,
      data: budgets,
    };
  }

  async findOne(id: string) {
    const budget = await this.budgetsRepository.findOneBy({ id });

    if (!budget) {
      throw new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND);
    }

    return budget;
  }

  async findOnePlain(id: string) {
    const budget = await this.budgetsRepository.findOne({
      where: { id },
      relations: { expenses: true },
    });

    if (!budget) {
      throw new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND);
    }

    return budget;
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto) {
    await this.findOne(id);
    const budget = this.budgetsRepository.create(updateBudgetDto);
    await this.budgetsRepository.update(id, budget);
    return {
      message: 'Presupuesto Actualizado',
    };
  }

  async remove(id: string) {
    const budget = await this.findOne(id);
    return await this.budgetsRepository.remove(budget);
  }
}
