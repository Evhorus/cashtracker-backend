/**
 * One bar's worth of chart data: total spent vs. still available
 * (summed across capped envelopes only) for one calendar month, e.g.
 * `label: "Ago 2026"`. Chronologically ascending. Scoped to one
 * currency at a time - see `chartCurrency` on
 * DashboardSummaryResponseDto for which one.
 */
export class DashboardChartEntryDto {
  label: string;
  spent: number;
  available: number;
}

/**
 * Totals for one currency the user actually has envelopes in. Money
 * amounts in different currencies are never the same unit, so summing
 * e.g. a COP envelope and a USD envelope into one number was always
 * wrong - the dashboard reports one of these per currency in use instead
 * of a single flattened total.
 */
export class DashboardCurrencyTotalsDto {
  currency: string;

  /** Count of envelopes in this currency (in `year`, if filtered). */
  totalEnvelopes: number;

  /** Sum of `amount` across envelopes in this currency that have a spending limit. */
  totalAssigned: number;

  /** Sum of `spent` across every envelope in this currency, capped or not. */
  totalSpent: number;

  /** totalAssigned minus spent, counting only capped envelopes, for this currency. */
  totalAvailable: number;
}

/**
 * Precomputed aggregates for the dashboard - the frontend renders this
 * directly, it doesn't recompute totals or chart data from a raw
 * envelope list.
 */
export class DashboardSummaryResponseDto {
  /** Count of envelopes (in `year`, if filtered) - currency-agnostic,
   * unlike `totals` below. */
  totalEnvelopes: number;

  /** One entry per currency the user has envelopes in. Empty when the
   * user has no envelopes at all. */
  totals: DashboardCurrencyTotalsDto[];

  /** Spending by month, most recent months, chronologically ascending. */
  chart: DashboardChartEntryDto[];

  /**
   * Which currency `chart` is scoped to - the requested `currency` query
   * param (see DashboardQueryDto) if the user has envelopes in it,
   * otherwise the user's most-used currency. Null when the user has no
   * envelopes at all (chart is then also empty). The frontend's currency
   * picker should reflect this, not just echo back what it requested -
   * a request for a currency the user doesn't have silently falls back
   * server-side rather than erroring or returning nothing.
   */
  chartCurrency: string | null;

  /** Distinct years the user has envelopes in, DESC - for a year picker. */
  availableYears: number[];
}
