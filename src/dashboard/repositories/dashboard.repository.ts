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
