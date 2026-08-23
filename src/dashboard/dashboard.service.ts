import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

const CHART_MONTHS_LIMIT = 12;

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
  ): Promise<DashboardSummaryResponseDto> {
    const [currencyAggregates, monthlySpending, availableYears] =
      await Promise.all([
        this.dashboardRepository.getSummaryAggregate(userId, year),
        this.dashboardRepository.getMonthlySpending(
          userId,
          year,
          CHART_MONTHS_LIMIT,
        ),
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
        totalAvailable: row.totalAssigned - row.cappedSpent,
      })),
      chart: monthlySpending.map((row) => ({
        label: formatMonthLabel(row.month, spansMultipleYears),
        spent: row.spent,
        available: row.available,
      })),
      availableYears,
    };
  }
}

function formatMonthLabel(monthKey: string, includeYear: boolean): string {
  const [yearPart, monthPart] = monthKey.split('-');
  const label = MONTH_LABELS_ES[parseInt(monthPart, 10) - 1] ?? monthKey;
  return includeYear ? `${label} ${yearPart}` : label;
}
