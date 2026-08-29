import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { DashboardCategoryBreakdownDto } from './dto/dashboard-category-breakdown-response.dto';
import { DashboardRecentExpenseDto } from './dto/dashboard-recent-expense-response.dto';

const CHART_MONTHS_LIMIT = 12;

export const RECENT_EXPENSES_DEFAULT_LIMIT = 5;

const MONTH_LABELS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

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

    // Only disambiguate the label with a year when the returned range
    // actually spans more than one - e.g. filtered to a single year, or
    // all the data happens to fall within one, "Ago" alone reads fine.
    const spansMultipleYears =
      new Set(monthlySpending.map((row) => row.month.slice(0, 4))).size > 1;

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
      chart: monthlySpending.map((row) => ({
        label: formatMonthLabel(row.month, spansMultipleYears),
        spent: row.spent,
        available: row.available,
      })),
      chartCurrency,
      availableYears,
    };
  }

  /**
   * Spending grouped by category for one currency - the "Gasto por
   * categoría" widget on Estadísticas.
   *
   * Its own endpoint rather than part of the summary: Resumen never
   * renders it, so folding it in would run an extra GROUP BY on every
   * dashboard load. Same reasoning as getRecentExpenses below.
   */
  async getCategoryBreakdown(
    userId: string,
    currency: string,
    year?: number,
  ): Promise<DashboardCategoryBreakdownDto[]> {
    return this.dashboardRepository.getCategoryBreakdown(
      userId,
      currency,
      year,
    );
  }

  /**
   * Separate from getSummary above rather than folded into it - the
   * Resumen page is the only caller (Estadísticas never renders this),
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

function formatMonthLabel(monthKey: string, includeYear: boolean): string {
  const [yearPart, monthPart] = monthKey.split('-');
  const label = MONTH_LABELS_ES[parseInt(monthPart, 10) - 1] ?? monthKey;
  return includeYear ? `${label} ${yearPart}` : label;
}
