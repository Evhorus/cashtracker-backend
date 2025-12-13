import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { UpdateBudgetDto } from '../dto/update-budget.dto';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { BudgetResponseDto } from '../dto/budget-response.dto';
import { BudgetWithExpensesResponseDto } from '../dto/budget-with-expenses-response.dto';
import { BudgetsRepository } from '../repositories/budgets.repository';

@Injectable()
export class BudgetsService {
  constructor(private readonly budgetsRepository: BudgetsRepository) {}

  async create(userId: string, createBudgetDto: CreateBudgetDto) {
    await this.budgetsRepository.create({
      ...createBudgetDto,
      spent: 0,
      userId,
    });

    return {
      message: 'Presupuesto creado',
    };
  }

  /**
   * Find all budgets without expenses (light query for list view)
   * More efficient than findAll when expenses are not needed
   */
  async findAllLight(userId: string) {
    const [budgets, count] =
      await this.budgetsRepository.findByUserIdLight(userId);

    return {
      count,
      data: BudgetResponseDto.fromEntities(budgets),
    };
  }

  /**
   * Find all budgets with expenses (full query for detail view)
   * Use this when you need expense data
   */
  async findAll(userId: string) {
    const [budgets, count] =
      await this.budgetsRepository.findByUserIdWithExpenses(userId);

    return {
      count,
      data: budgets.map(BudgetWithExpensesResponseDto.fromEntity),
    };
  }

  async findOne(id: string) {
    const budget = await this.budgetsRepository.findById(id);

    if (!budget) {
      throw new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND);
    }

    return budget;
  }

  async findOnePlain(id: string) {
    const budget = await this.budgetsRepository.findByIdWithExpenses(id);

    if (!budget) {
      throw new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND);
    }

    return BudgetWithExpensesResponseDto.fromEntity(budget);
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto) {
    await this.findOne(id);
    await this.budgetsRepository.update(id, updateBudgetDto);
    return {
      message: 'Presupuesto Actualizado',
    };
  }

  async remove(id: string) {
    const budget = await this.findOne(id);
    return await this.budgetsRepository.remove(budget);
  }
}
