import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';

/**
 * Custom repository for Expense entity
 * Encapsulates complex queries and data access logic
 */
@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly repository: Repository<Expense>,
  ) {}

  /**
   * Find one expense by ID
   */
  async findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  /**
   * Create a new expense
   */
  async create(expenseData: Partial<Expense>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    const expense = repo.create(expenseData);
    return repo.save(expense);
  }

  /**
   * Update an expense
   */
  async update(
    id: string,
    expenseData: Partial<Expense>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.update(id, expenseData);
  }

  /**
   * Delete an expense
   */
  async delete(id: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.delete({ id });
  }

  /**
   * Calculate total spent for a budget
   */
  async calculateTotalSpent(budgetId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;

    const result = await repo
      .createQueryBuilder('expense')
      .where('expense.budgetId = :budgetId', { budgetId })
      .select('SUM(expense.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    return result && result.sum ? parseFloat(result.sum) : 0;
  }

  /**
   * Find all expenses for a budget with filters
   */
  async findAll(
    budgetId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      search?: string;
      categoryId?: string;
      sort?: 'ASC' | 'DESC';
    },
  ) {
    const query = this.repository.createQueryBuilder('expense');

    query.where('expense.budgetId = :budgetId', { budgetId });

    if (filters.startDate) {
      query.andWhere('expense.date >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('expense.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.search) {
      query.andWhere(
        '(LOWER(expense.name) LIKE LOWER(:search) OR LOWER(expense.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.categoryId) {
      // Assuming future category relation or column
      // query.andWhere('expense.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    const sortOrder = filters.sort || 'ASC'; // Default to ASC as requested
    query.orderBy('expense.date', sortOrder);
    query.addOrderBy('expense.createdAt', 'DESC'); // Secondary sort always DESC (creation order)

    return query.getMany();
  }
}
