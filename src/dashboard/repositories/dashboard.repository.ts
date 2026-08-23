import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Envelope } from '../../envelopes/entities/envelope.entity';

interface SummaryAggregateRow {
  currency: string;
  count: string;
  totalAssigned: string;
  totalSpent: string;
  cappedSpent: string;
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
   * recent `limit` months, returned chronologically ascending.
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
  ) {
    const rows = await this.withUserAndYear(userId, year)
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
}
