/**
 * One bar's worth of chart data: how much of an envelope's assigned
 * amount was spent vs. still available. `available` is 0 for envelopes
 * with no spending limit - there's no assigned amount to split against.
 */
export class DashboardChartEntryDto {
  name: string;
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

  /** Top 5 envelopes by amount spent, for the summary bar chart. */
  chart: DashboardChartEntryDto[];

  /** Distinct years the user has envelopes in, DESC - for a year picker. */
  availableYears: number[];
}
