import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { DashboardCategoryBreakdownDto } from './dto/dashboard-category-breakdown-response.dto';
import { DashboardEnvelopeBreakdownDto } from './dto/dashboard-envelope-breakdown-response.dto';
import { DashboardNameBreakdownDto } from './dto/dashboard-name-breakdown-response.dto';
import { DashboardBreakdownTotalDto } from './dto/dashboard-breakdown-total-response.dto';
import { DashboardRecentExpenseDto } from './dto/dashboard-recent-expense-response.dto';

/** Shared by the four breakdown methods below - see
 * DashboardRepository.withUserCurrencyAndDateRange for how they're
 * applied. */
interface BreakdownFilters {
  year?: number;
  startDate?: string;
  endDate?: string;
}

const CHART_MONTHS_LIMIT = 12;

export const RECENT_EXPENSES_DEFAULT_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(
    userId: string,
    year?: number,
    currency?: string,
  ): Promise<DashboardSummaryResponseDto> {
    // getMonthlySpending needs to know which currency to run against
    // before it can run (see its own doc comment on why it's scoped to
    // one currency), so this can't be a single Promise.all the way the
    // three queries used to be - the aggregate has to resolve first.
    const currencyAggregates =
      await this.dashboardRepository.getSummaryAggregate(userId, year);
    // Already ordered by envelope count DESC - the same "most-used
    // currency" the summary totals put first.
    const primaryCurrency = currencyAggregates[0]?.currency;
    // `currency` is a request to view a specific one (see
    // dashboard-query.dto.ts) - honor it only if the user actually has
    // envelopes in it, otherwise silently fall back to the primary one
    // rather than querying a currency with nothing to show. Either way,
    // `chartCurrency` in the response says which one was actually used,
    // since the frontend can no longer just assume "primary".
    const chartCurrency =
      (currency &&
        currencyAggregates.find((row) => row.currency === currency)
          ?.currency) ||
      primaryCurrency ||
      null;

    const [monthlySpending, availableYears] = await Promise.all([
      chartCurrency
        ? this.dashboardRepository.getMonthlySpending(
            userId,
            year,
            CHART_MONTHS_LIMIT,
            chartCurrency,
          )
        : Promise.resolve([]),
      this.dashboardRepository.getAvailableYears(userId),
    ]);

    return {
      // Currency-agnostic - "how many envelopes" doesn't need splitting
      // by currency the way the money totals below do.
      totalEnvelopes: currencyAggregates.reduce(
        (sum, row) => sum + row.count,
        0,
      ),
      totals: currencyAggregates.map((row) => ({
        currency: row.currency,
        totalEnvelopes: row.count,
        totalAssigned: row.totalAssigned,
        totalSpent: row.totalSpent,
        totalSpentCapped: row.cappedSpent,
        totalAvailable: row.totalAssigned - row.cappedSpent,
      })),
      // The raw "YYYY-MM" key, not a formatted month name. This used
      // to send `label: "Ago 2026"`, which pinned every client to
      // Spanish - a month name is presentation, and this API has more
      // than one kind of reader (the web app in two languages, and a
      // mobile app later). Deciding whether the year is worth showing
      // is presentation too, so that moves with it.
      chart: monthlySpending.map((row) => ({
        month: row.month,
        spent: row.spent,
        available: row.available,
      })),
      chartCurrency,
      availableYears,
    };
  }

  /**
   * Spending grouped by category, for one currency and period - one tab
   * of the statistics page's breakdown card. Scoped by each expense's
   * own date (see DashboardRepository.withUserCurrencyAndDateRange),
   * not by when its envelope was created.
   *
   * Its own endpoint rather than part of the summary: the summary page
   * never renders it, so folding it in would run an extra GROUP BY on every
   * dashboard load. Same reasoning as getRecentExpenses below.
   */
  async getCategoryBreakdown(
    userId: string,
    currency: string,
    filters: BreakdownFilters = {},
  ): Promise<DashboardCategoryBreakdownDto[]> {
    return this.dashboardRepository.getCategoryBreakdown(
      userId,
      currency,
      filters,
    );
  }

  /**
   * Spending grouped by envelope, for one currency and period - the
   * "por sobre" tab next to getCategoryBreakdown above.
   */
  async getEnvelopeBreakdown(
    userId: string,
    currency: string,
    filters: BreakdownFilters = {},
  ): Promise<DashboardEnvelopeBreakdownDto[]> {
    return this.dashboardRepository.getEnvelopeBreakdown(
      userId,
      currency,
      filters,
    );
  }

  /**
   * Spending grouped by the expense's own name, for one currency and
   * period - surfaces recurring expenses (e.g. "Arriendo" paid every
   * month) as a single total, the "por nombre" tab.
   */
  async getNameBreakdown(
    userId: string,
    currency: string,
    filters: BreakdownFilters = {},
  ): Promise<DashboardNameBreakdownDto[]> {
    return this.dashboardRepository.getNameBreakdown(userId, currency, filters);
  }

  /**
   * The grand total across every expense in the period/currency - the
   * "Total" tab, a single number rather than a list of rows.
   */
  async getBreakdownTotal(
    userId: string,
    currency: string,
    filters: BreakdownFilters = {},
  ): Promise<DashboardBreakdownTotalDto> {
    return this.dashboardRepository.getBreakdownTotal(
      userId,
      currency,
      filters,
    );
  }

  /**
   * Separate from getSummary above rather than folded into it - the
   * summary page is the only caller (statistics never renders this),
   * so bundling it into the summary would mean an unused query running
   * on every year/currency-filtered chart reload on that other page.
   */
  async getRecentExpenses(
    userId: string,
    limit: number = RECENT_EXPENSES_DEFAULT_LIMIT,
  ): Promise<DashboardRecentExpenseDto[]> {
    return this.dashboardRepository.getRecentExpenses(userId, limit);
  }
}
