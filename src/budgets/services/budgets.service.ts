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

  async findAll(userId: string) {
    const [budgets, count] = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.expenses', 'expense')
      .where('budget.userId = :userId', { userId })
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
