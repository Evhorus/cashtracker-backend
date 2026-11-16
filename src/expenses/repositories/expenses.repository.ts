import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Expense } from '../entities/expense.entity';
import type { ReportScope } from '../utils/report-scopes';

/** One row of a report total: a currency, and the payment method too
 * when grouped by it (null = expenses without one). */
export interface ReportTotalRow {
  paymentMethodId: string | null;
  currency: string;
  total: number;
  count: number;
}

interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: 'ASC' | 'DESC';
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
    query.orderBy('expense.date', sortOrder);
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

  /**
   * The user's expenses (across all their envelopes) that fall in any of
   * the scopes: each scope is one payment method, or none, with its own
   * date range. Callers must not pass an empty list - it would match
   * every expense of the user.
   */
  private buildReportQuery(
    userId: string,
    scopes: ReportScope[],
  ): SelectQueryBuilder<Expense> {
    return this.repository
      .createQueryBuilder('expense')
      .innerJoin('expense.envelope', 'envelope')
      .where('envelope.userId = :userId', { userId })
      .andWhere(
        new Brackets((anyScope) => {
          scopes.forEach((scope, index) => {
            const method =
              scope.paymentMethodId === null
                ? 'expense.paymentMethodId IS NULL'
                : `expense.paymentMethodId = :method${index}`;
            anyScope.orWhere(
              `(${method} AND expense.date BETWEEN :start${index} AND :end${index})`,
              {
                [`method${index}`]: scope.paymentMethodId,
                [`start${index}`]: scope.startDate,
                [`end${index}`]: scope.endDate,
              },
            );
          });
        }),
      );
  }

  /** Every matching expense, newest first, with its envelope and
   * payment method - a report is read or exported whole, so it is not
   * paginated; the period bounds it. */
  findForReport(userId: string, scopes: ReportScope[]) {
    return this.buildReportQuery(userId, scopes)
      .addSelect(['envelope.id', 'envelope.name'])
      .leftJoinAndSelect('expense.paymentMethod', 'paymentMethod')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .getMany();
  }

  /** Sums per payment method and currency, computed by Postgres so no
   * float addition touches money. */
  async sumForReport(
    userId: string,
    scopes: ReportScope[],
  ): Promise<ReportTotalRow[]> {
    const rows = await this.buildReportQuery(userId, scopes)
      .select('expense.paymentMethodId', 'paymentMethodId')
      .addSelect('expense.currency', 'currency')
      .addSelect('SUM(expense.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('expense.paymentMethodId')
      .addGroupBy('expense.currency')
      .getRawMany<{
        paymentMethodId: string | null;
        currency: string;
        total: string;
        count: string;
      }>();

    return rows.map((row) => ({
      paymentMethodId: row.paymentMethodId,
      currency: row.currency,
      total: parseFloat(row.total),
      count: Number(row.count),
    }));
  }

  /** Grand total per currency over the same expenses. */
  async sumForReportByCurrency(userId: string, scopes: ReportScope[]) {
    const rows = await this.buildReportQuery(userId, scopes)
      .select('expense.currency', 'currency')
      .addSelect('SUM(expense.amount)', 'total')
      .groupBy('expense.currency')
      .orderBy('expense.currency', 'ASC')
      .getRawMany<{ currency: string; total: string }>();

    return rows.map((row) => ({
      currency: row.currency,
      total: parseFloat(row.total),
    }));
  }
}
