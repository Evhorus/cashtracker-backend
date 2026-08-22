/**
 * One bar's worth of chart data: total spent vs. still available
 * (summed across capped envelopes only) for one calendar month, e.g.
 * `label: "Ago 2026"`. Chronologically ascending.
 */
export class DashboardChartEntryDto {
  label: string;
  spent: number;
  available: number;
}

/**
 * Precomputed aggregates for the dashboard - the frontend renders this
 * directly, it doesn't recompute totals or chart data from a raw
 * envelope list.
 */
export class DashboardSummaryResponseDto {
  /** Count of envelopes (in `year`, if filtered). */
  totalEnvelopes: number;

  /** Sum of `amount` across envelopes that have a spending limit. */
  totalAssigned: number;

  /** Sum of `spent` across every envelope, capped or not. */
  totalSpent: number;

  /** totalAssigned minus spent, counting only capped envelopes. */
  totalAvailable: number;

  /** Spending by month, most recent months, chronologically ascending. */
  chart: DashboardChartEntryDto[];

  /** Distinct years the user has envelopes in, DESC - for a year picker. */
  availableYears: number[];
}
