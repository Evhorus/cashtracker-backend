import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Envelope } from '../../envelopes/entities/envelope.entity';
import { Expense } from '../../expenses/entities/expense.entity';

interface SummaryAggregateRow {
  currency: string;
  count: string;
  totalAssigned: string;
  totalSpent: string;
  cappedSpent: string;
}

interface RecentExpenseRow {
  id: string;
  name: string;
  amount: string;
  currency: string;
  date: Date;
  envelopeId: string;
  envelopeName: string;
}

/**
 * Read-only aggregate queries for the dashboard. Kept separate from
 * EnvelopesRepository (which owns envelope CRUD) - this is reporting,
 * a different responsibility that may one day need to reach across
 * entities (e.g. expenses) that plain envelope CRUD never will.
 */
@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(Envelope)
    private readonly repository: Repository<Envelope>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  private withUserAndYear(userId: string, year?: number) {
    const qb = this.repository
      .createQueryBuilder('envelope')
      .where('envelope.userId = :userId', { userId });

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM envelope.createdAt) = :year', { year });
    }

    return qb;
  }

  /**
   * Shared base for the four "breakdown" queries (category, envelope,
   * name, total) - all four group the same underlying set of expenses,
   * just along a different axis, so they all start from one query.
   *
   * Filters by each expense's own `date`, not the envelope's
   * `createdAt` the way withUserAndYear above does - an envelope in
   * this app can carry expenses spanning several months (e.g. a rent
   * envelope created in September with expenses dated back to
   * February), so scoping a period-filtered breakdown to the envelope's
   * creation date would silently exclude expenses that are genuinely
   * inside the requested period, and include ones that aren't.
   *
   * An exact range (startDate/endDate) wins over `year` when somehow
   * both are present - the frontend never sends both (see
   * BreakdownQueryDto), but a range is the more specific instruction
   * either way. All three omitted means all-time.
   */
  private withUserCurrencyAndDateRange(
    userId: string,
    currency: string,
    filters: { year?: number; startDate?: string; endDate?: string },
  ) {
    const qb = this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.envelope', 'envelope')
      .where('envelope.userId = :userId', { userId })
      .andWhere('expense.currency = :currency', { currency });

    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        qb.andWhere('expense.date >= :startDate', {
          startDate: filters.startDate,
        });
      }
      if (filters.endDate) {
        qb.andWhere('expense.date <= :endDate', { endDate: filters.endDate });
      }
    } else if (filters.year) {
      qb.andWhere('EXTRACT(YEAR FROM expense.date) = :year', {
        year: filters.year,
      });
    }

    return qb;
  }

  /**
   * Aggregate query grouped by category: sum of expense amounts and how
   * many expenses contributed, one row per category the user actually
   * has spending in during the requested period. Scoped to a single
   * currency, for the same reason the chart is - summing money across
   * currencies is meaningless.
   *
   * Exists so the breakdown doesn't have to fetch every envelope and
   * reduce over it client-side, which was capped at the list endpoint's
   * 100 and silently dropped categories for a large account.
   *
   * Groups by the category's id now that it is a real relation. When it
   * was free text this grouped by the string, so two spellings of one
   * category were two rows and the client had to re-merge them - that
   * whole step is gone. Envelopes with no category group into a single
   * `category: null` row; the caller decides how to label it.
   *
   * The label/colour/icon come back with each row so the caller can
   * render the chip without a second lookup, matching how envelope
   * responses embed their category.
   */
  async getCategoryBreakdown(
    userId: string,
    currency: string,
    filters: { year?: number; startDate?: string; endDate?: string } = {},
  ) {
    const rows = await this.withUserCurrencyAndDateRange(
      userId,
      currency,
      filters,
    )
      .leftJoin('envelope.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.label', 'label')
      .addSelect('category.color', 'color')
      .addSelect('category.icon', 'icon')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'spent')
      .addSelect('COUNT(*)', 'expenseCount')
      .groupBy('category.id')
      .addGroupBy('category.label')
      .addGroupBy('category.color')
      .addGroupBy('category.icon')
      .orderBy('SUM(expense.amount)', 'DESC')
      .getRawMany<{
        categoryId: string | null;
        label: string | null;
        color: string | null;
        icon: string | null;
        spent: string;
        expenseCount: string;
      }>();

    return rows.map((row) => ({
      category: row.categoryId
        ? {
            id: row.categoryId,
            label: row.label as string,
            color: row.color as string,
            icon: row.icon as string,
          }
        : null,
      spent: Number(row.spent),
      expenseCount: Number(row.expenseCount),
    }));
  }

  /**
   * Aggregate query grouped by envelope: sum of expense amounts and how
   * many expenses contributed, one row per envelope with spending in
   * the requested period/currency. Same date-scoping as
   * getCategoryBreakdown above.
   */
  async getEnvelopeBreakdown(
    userId: string,
    currency: string,
    filters: { year?: number; startDate?: string; endDate?: string } = {},
  ) {
    const rows = await this.withUserCurrencyAndDateRange(
      userId,
      currency,
      filters,
    )
      .select('envelope.id', 'envelopeId')
      .addSelect('envelope.name', 'envelopeName')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'spent')
      .addSelect('COUNT(*)', 'expenseCount')
      .groupBy('envelope.id')
      .addGroupBy('envelope.name')
      .orderBy('SUM(expense.amount)', 'DESC')
      .getRawMany<{
        envelopeId: string;
        envelopeName: string;
        spent: string;
        expenseCount: string;
      }>();

    return rows.map((row) => ({
      envelopeId: row.envelopeId,
      envelopeName: row.envelopeName,
      spent: Number(row.spent),
      expenseCount: Number(row.expenseCount),
    }));
  }

  /**
   * Aggregate query grouped by the expense's own name: sum of amounts
   * and how many expenses share it, one row per distinct name with
   * spending in the requested period/currency - surfaces recurring
   * expenses (e.g. "Arriendo" paid every month) as a single total.
   * `normalizeString` only trims/collapses whitespace on save, it never
   * touches casing - "Mercaldas" and "MERCALDAS" are both valid stored
   * values for the same merchant (typing habits, bulk imports from a
   * bank export, ...). Grouping on `LOWER(expense.name)` instead of the
   * raw column keeps those from splitting into separate rows here.
   */
  async getNameBreakdown(
    userId: string,
    currency: string,
    filters: { year?: number; startDate?: string; endDate?: string } = {},
  ) {
    const rows = await this.withUserCurrencyAndDateRange(
      userId,
      currency,
      filters,
    )
      .select('LOWER(expense.name)', 'name')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'spent')
      .addSelect('COUNT(*)', 'expenseCount')
      .groupBy('LOWER(expense.name)')
      .orderBy('SUM(expense.amount)', 'DESC')
      .getRawMany<{ name: string; spent: string; expenseCount: string }>();

    return rows.map((row) => ({
      name: row.name,
      spent: Number(row.spent),
      expenseCount: Number(row.expenseCount),
    }));
  }

  /**
   * The grand total across every matching expense - the same set of
   * rows the three breakdowns above each group differently, collapsed
   * to one number. Its own query rather than summing one of the other
   * three client-side, so the total is right even when every breakdown
   * happens to be empty (e.g. every expense's envelope has no category,
   * which would make getCategoryBreakdown return a single `null`-
   * category row - correct, but an easy thing to get wrong summing over
   * client-side).
   */
  async getBreakdownTotal(
    userId: string,
    currency: string,
    filters: { year?: number; startDate?: string; endDate?: string } = {},
  ) {
    const row = await this.withUserCurrencyAndDateRange(
      userId,
      currency,
      filters,
    )
      .select('COALESCE(SUM(expense.amount), 0)', 'spent')
      .addSelect('COUNT(*)', 'expenseCount')
      .getRawOne<{ spent: string; expenseCount: string }>();

    return {
      spent: Number(row?.spent ?? 0),
      expenseCount: Number(row?.expenseCount ?? 0),
    };
  }

  /**
   * Aggregate query grouped by currency: envelope count, sum of assigned
   * amounts (capped envelopes only), sum of spent (all envelopes), and
   * sum of spent restricted to capped envelopes (needed to compute
   * totalAvailable without including unlimited envelopes as if they had
   * a $0 budget) - one row per currency the user has envelopes in.
   * Money in different currencies is never one unit, so this can't be a
   * single flat aggregate the way it used to be.
   */
  async getSummaryAggregate(userId: string, year?: number) {
    const rows = await this.withUserAndYear(userId, year)
      .select('envelope.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(envelope.amount), 0)', 'totalAssigned')
      .addSelect('COALESCE(SUM(envelope.spent), 0)', 'totalSpent')
      .addSelect(
        'COALESCE(SUM(CASE WHEN envelope.amount IS NOT NULL THEN envelope.spent ELSE 0 END), 0)',
        'cappedSpent',
      )
      .groupBy('envelope.currency')
      // Most-used currency first (by envelope count) - GROUP BY alone
      // has no defined row order, and the frontend renders the first
      // entry inline as the "primary" one, the rest in their own
      // labeled rows below. Without this, which currency ends up
      // "primary" is arbitrary.
      .orderBy('count', 'DESC')
      .getRawMany<SummaryAggregateRow>();

    return rows.map((row) => ({
      currency: row.currency,
      count: Number(row.count),
      totalAssigned: Number(row.totalAssigned),
      totalSpent: Number(row.totalSpent),
      cappedSpent: Number(row.cappedSpent),
    }));
  }

  /**
   * Spending grouped by calendar month (of envelope.createdAt), most
   * recent `limit` months, returned chronologically ascending. Scoped to
   * a single `currency` - summing spent/available across currencies
   * would mix units on the same bars the same way the old flat summary
   * totals did (see getSummaryAggregate's doc comment). The service
   * picks the user's most-used currency and passes it in here; a
   * genuine per-currency chart (multiple charts, or a picker) is a
   * bigger UI change than scoping to one.
   *
   * Grouping by envelope (the previous chart) mixed unrelated axes -
   * envelopes here are really "one account for one month" (e.g.
   * "Marzo Rappi", "Marzo Scotiobank"), so a per-envelope chart bounced
   * between accounts and months with no consistent order. Per-month is
   * the one grouping that's both meaningful on its own (this app's
   * envelopes are always period-scoped) and naturally sorts
   * chronologically - the standard "spending over time" view every
   * comparable budgeting app leads with.
   */
  async getMonthlySpending(
    userId: string,
    year: number | undefined,
    limit: number,
    currency: string,
  ) {
    const rows = await this.withUserAndYear(userId, year)
      .andWhere('envelope.currency = :currency', { currency })
      .select("TO_CHAR(envelope.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(envelope.spent), 0)', 'spent')
      .addSelect(
        'COALESCE(SUM(CASE WHEN envelope.amount IS NOT NULL THEN GREATEST(envelope.amount - envelope.spent, 0) ELSE 0 END), 0)',
        'available',
      )
      .groupBy("TO_CHAR(envelope.createdAt, 'YYYY-MM')")
      .orderBy('month', 'DESC')
      .limit(limit)
      .getRawMany<{ month: string; spent: string; available: string }>();

    return rows
      .map((row) => ({
        month: row.month,
        spent: Number(row.spent),
        available: Number(row.available),
      }))
      .reverse();
  }

  /**
   * Distinct calendar years the user has envelopes in, most recent
   * first - powers a year picker on the frontend.
   */
  async getAvailableYears(userId: string): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder('envelope')
      .select('DISTINCT EXTRACT(YEAR FROM envelope.createdAt)', 'year')
      .where('envelope.userId = :userId', { userId })
      .orderBy('year', 'DESC')
      .getRawMany<{ year: string }>();

    return rows.map((row) => Number(row.year));
  }

  /**
   * The `limit` most recent expenses across every envelope the user
   * owns, most recent first (by date, then createdAt as a tiebreaker for
   * same-day expenses) - powers the "Actividad reciente" widget on the
   * Resumen page. Scoped via an inner join on envelope.userId rather
   * than a separate envelope-ids-first query, same join style as
   * getSummaryAggregate above.
   */
  async getRecentExpenses(userId: string, limit: number) {
    const rows = await this.expenseRepository
      .createQueryBuilder('expense')
      .innerJoin('expense.envelope', 'envelope')
      .where('envelope.userId = :userId', { userId })
      .select('expense.id', 'id')
      .addSelect('expense.name', 'name')
      .addSelect('expense.amount', 'amount')
      .addSelect('expense.currency', 'currency')
      .addSelect('expense.date', 'date')
      .addSelect('envelope.id', 'envelopeId')
      .addSelect('envelope.name', 'envelopeName')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<RecentExpenseRow>();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      currency: row.currency,
      date: row.date,
      envelopeId: row.envelopeId,
      envelopeName: row.envelopeName,
    }));
  }
}
