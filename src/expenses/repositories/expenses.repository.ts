import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Expense } from '../entities/expense.entity';

interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: 'ASC' | 'DESC';
  sortBy?: 'date' | 'amount';
  paymentMethodIds?: string[];
  includeUnassigned?: boolean;
}

@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly repository: Repository<Expense>,
  ) {}

  async findById(id: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.findOne({ where: { id }, relations: { paymentMethod: true } });
  }

  async create(expenseData: Partial<Expense>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    const expense = repo.create(expenseData);
    return repo.save(expense);
  }

  async update(
    id: string,
    expenseData: Partial<Expense>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.update(id, expenseData);
  }

  async delete(id: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.delete({ id });
  }

  /**
   * The `envelopeId` + search/date-range conditions shared by `findAll`
   * and `calculateFilteredTotal`. Sorting and pagination are deliberately
   * left out here - they only ever apply to the page of rows being
   * listed, never to the aggregate over the full filtered set.
   */
  private buildFilteredQuery(
    envelopeId: string,
    filters: ExpenseFilters,
  ): SelectQueryBuilder<Expense> {
    const query = this.repository.createQueryBuilder('expense');

    query.where('expense.envelopeId = :envelopeId', { envelopeId });

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

    const methodIds = filters.paymentMethodIds ?? [];
    if (methodIds.length > 0 || filters.includeUnassigned) {
      // Any of the selected methods, or none at all when asked - an OR
      // inside its own brackets so it cannot leak past the envelope
      // condition above.
      query.andWhere(
        new Brackets((byMethod) => {
          if (methodIds.length > 0) {
            byMethod.orWhere('expense.paymentMethodId IN (:...methodIds)', {
              methodIds,
            });
          }
          if (filters.includeUnassigned) {
            byMethod.orWhere('expense.paymentMethodId IS NULL');
          }
        }),
      );
    }

    return query;
  }

  async findAll(
    envelopeId: string,
    filters: ExpenseFilters,
    page: number,
    limit: number,
  ) {
    const query = this.buildFilteredQuery(
      envelopeId,
      filters,
    ).leftJoinAndSelect('expense.paymentMethod', 'paymentMethod');

    // Most recent first by default - the conventional order for a
    // transaction/expense history (what did I just spend, not what did
    // I spend first), and what the frontend's own "Actividad reciente"
    // dashboard widget already assumes for expenses.
    const sortOrder = filters.sort || 'DESC';
    if (filters.sortBy === 'amount') {
      // Ties (same amount) fall back to newest first.
      query.orderBy('expense.amount', sortOrder);
      query.addOrderBy('expense.date', 'DESC');
    } else {
      query.orderBy('expense.date', sortOrder);
    }
    query.addOrderBy('expense.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }

  /**
   * Sum of `amount` over the *entire* filtered result set (same
   * search/date-range as `findAll`), not just the page in hand - a
   * filter that spans more than one page would otherwise show a
   * misleading partial total.
   */
  async calculateFilteredTotal(envelopeId: string, filters: ExpenseFilters) {
    const result = await this.buildFilteredQuery(envelopeId, filters)
      .select('SUM(expense.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    return result && result.sum ? parseFloat(result.sum) : 0;
  }
}
