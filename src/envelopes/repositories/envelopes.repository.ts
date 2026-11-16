import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Envelope } from '../entities/envelope.entity';
import { Expense } from '../../expenses/entities/expense.entity';
import type { EnvelopeSort } from '../dto/get-envelopes-filter.dto';
import {
  buildEnvelopeStatusPredicate,
  type EnvelopeStatusFilter,
} from '../utils/envelope-status';

/**
 * Custom repository for Envelope entity
 * Encapsulates complex queries and data access logic
 */
export interface EnvelopeListFilters {
  search?: string;
  status?: EnvelopeStatusFilter;
  sort?: EnvelopeSort;
}

@Injectable()
export class EnvelopesRepository {
  constructor(
    @InjectRepository(Envelope)
    private readonly repository: Repository<Envelope>,
  ) {}

  /**
   * Find all envelopes for a user without expenses (light query)
   * Optimized for list views. Paginated (page is 1-indexed). `search`
   * optionally filters by name/category, case-insensitive.
   *
   * Uses createQueryBuilder rather than findAndCount's find-options shape -
   * the same choice ExpensesRepository.findAll makes - since a case-
   * insensitive OR-across-columns LIKE isn't expressible there.
   */
  async findByUserIdLight(
    userId: string,
    page: number,
    limit: number,
    filters: EnvelopeListFilters = {},
  ) {
    const query = this.repository
      .createQueryBuilder('envelope')
      .where('envelope.userId = :userId', { userId })
      // The category travels with the envelope now that it's a relation -
      // responses embed it (label/colour/icon) so clients don't resolve
      // it themselves. A left join: an envelope without one is normal.
      .leftJoin('envelope.category', 'category')
      .select([
        'envelope.id',
        'envelope.name',
        'envelope.amount',
        'envelope.currency',
        'envelope.spent',
        'envelope.description',
        'envelope.createdAt',
        'envelope.updatedAt',
        'category.id',
        'category.label',
        'category.color',
        'category.icon',
      ]);

    if (filters.search) {
      query.andWhere(
        // `category` is a joined table now, not a column on envelope.
        '(LOWER(envelope.name) LIKE LOWER(:search) OR LOWER(category.label) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    // Status is derived from amount/spent, so it filters in SQL rather
    // than in memory - which is what keeps getManyAndCount()'s total
    // honest. The web client used to fetch every envelope (capped at 100)
    // and filter client-side, silently under-reporting past that cap.
    if (filters.status) {
      const predicate = buildEnvelopeStatusPredicate(filters.status);
      if (predicate) {
        query.andWhere(`(${predicate.clause})`, predicate.params);
      }
    }

    // The period it covers: its latest expense, or its creation date
    // while it has none - the date its card shows.
    const direction = filters.sort === 'oldest' ? 'ASC' : 'DESC';
    query.addSelect(
      `COALESCE((SELECT MAX(expense.date) FROM expense WHERE expense."envelopeId" = envelope.id), envelope.created_at::date)`,
      'period_end',
    );
    query.orderBy('period_end', direction);
    query.addOrderBy('envelope.createdAt', direction);
    // offset/limit rather than skip/take: the only join is many-to-one,
    // so rows never multiply, and skip/take's two-query pagination
    // cannot order by a computed column.
    query.offset((page - 1) * limit).limit(limit);

    return query.getManyAndCount();
  }

  /**
   * First and last expense date of each envelope, in one grouped query
   * for a whole page of the list. `::text` keeps them `YYYY-MM-DD`: the
   * pg driver would otherwise turn a raw `date` into a JS Date at local
   * midnight. Envelopes without expenses are simply absent.
   */
  async findExpenseDateRanges(
    envelopeIds: string[],
  ): Promise<Map<string, { first: string; last: string }>> {
    if (envelopeIds.length === 0) return new Map();
    const rows = await this.repository.manager
      .createQueryBuilder(Expense, 'expense')
      .select('expense.envelopeId', 'envelopeId')
      .addSelect('MIN(expense.date)::text', 'first')
      .addSelect('MAX(expense.date)::text', 'last')
      .where('expense.envelopeId IN (:...envelopeIds)', { envelopeIds })
      .groupBy('expense.envelopeId')
      .getRawMany<{ envelopeId: string; first: string; last: string }>();
    return new Map(
      rows.map((row) => [row.envelopeId, { first: row.first, last: row.last }]),
    );
  }

  /**
   * Find one envelope by ID
   */
  async findById(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { category: true },
    });
  }

  /**
   * Find one envelope by ID with expenses
   */
  async findByIdWithExpenses(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { expenses: { paymentMethod: true }, category: true },
    });
  }

  /**
   * Create a new envelope
   */
  async create(envelopeData: Partial<Envelope>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    const envelope = repo.create(envelopeData);
    return repo.save(envelope);
  }

  /**
   * Update an envelope
   */
  async update(
    id: string,
    envelopeData: Partial<Envelope>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.update(id, envelopeData);
  }

  /**
   * Remove an envelope
   */
  async remove(envelope: Envelope, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.remove(envelope);
  }

  /**
   * Loads the envelope with a row lock (`SELECT ... FOR UPDATE`) inside
   * the caller's transaction. Every write that touches an envelope's
   * expenses takes this lock first, so two requests on the same envelope
   * (a double tap, a retry, two devices) run one after the other instead
   * of both acting on what they read before the other committed.
   */
  async findByIdForUpdate(id: string, manager: EntityManager) {
    return manager.getRepository(Envelope).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Sets `spent` to the exact sum of the envelope's expenses.
   *
   * `spent` is a stored total so lists and filters can read it without
   * aggregating. It used to be adjusted by increments and decrements,
   * which drift for good the moment one is applied twice or lost.
   * Recomputing it from the rows on every write keeps it exact by
   * construction and repairs any earlier drift on the next write.
   */
  async recalculateSpent(id: string, manager: EntityManager) {
    await manager.query(
      `UPDATE envelope
         SET spent = (
           SELECT COALESCE(SUM(amount), 0) FROM expense WHERE "envelopeId" = $1
         )
       WHERE id = $1`,
      [id],
    );
  }

  /** Whether the envelope has at least one expense. */
  async hasExpenses(id: string) {
    return this.repository.manager.exists(Expense, {
      where: { envelopeId: id },
    });
  }
}
