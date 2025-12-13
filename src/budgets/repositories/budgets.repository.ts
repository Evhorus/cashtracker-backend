import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';

/**
 * Custom repository for Budget entity
 * Encapsulates complex queries and data access logic
 */
@Injectable()
export class BudgetsRepository {
  constructor(
    @InjectRepository(Budget)
    private readonly repository: Repository<Budget>,
  ) {}

  /**
   * Find all budgets for a user without expenses (light query)
   * Optimized for list views
   */
  async findByUserIdLight(userId: string) {
    return this.repository.findAndCount({
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
  }

  /**
   * Find all budgets for a user with expenses (full query)
   * Optimized for detail views
   */
  async findByUserIdWithExpenses(userId: string) {
    return this.repository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.expenses', 'expense')
      .where('budget.userId = :userId', { userId })
      .orderBy('budget.createdAt', 'DESC')
      .getManyAndCount();
  }

  /**
   * Find one budget by ID
   */
  async findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  /**
   * Find one budget by ID with expenses
   */
  async findByIdWithExpenses(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { expenses: true },
    });
  }

  /**
   * Create a new budget
   */
  async create(budgetData: Partial<Budget>) {
    const budget = this.repository.create(budgetData);
    return this.repository.save(budget);
  }

  /**
   * Update a budget
   */
  async update(id: string, budgetData: Partial<Budget>) {
    return this.repository.update(id, budgetData);
  }

  /**
   * Remove a budget
   */
  async remove(budget: Budget) {
    return this.repository.remove(budget);
  }

  /**
   * Increment spent amount
   */
  async incrementSpent(id: string, amount: number) {
    return this.repository.increment({ id }, 'spent', amount);
  }

  /**
   * Decrement spent amount
   */
  async decrementSpent(id: string, amount: number) {
    return this.repository.decrement({ id }, 'spent', amount);
  }
}
