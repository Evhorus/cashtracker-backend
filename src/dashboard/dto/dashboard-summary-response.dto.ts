/**
 * One bar's worth of chart data: what was spent in one calendar month,
 * by each expense's own date. Chronologically ascending. Scoped to one currency at a time - see
 * `chartCurrency` on DashboardSummaryResponseDto for which one.
 */
export class DashboardChartEntryDto {
  /** "YYYY-MM", e.g. "2026-08". Deliberately not a formatted month
   * name: the client owns how (and in which language) it reads. */
  month: string;
  spent: number;
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

  /** Count of envelopes in this currency. */
  totalEnvelopes: number;

  /** Sum of `amount` across envelopes in this currency that have a spending limit. */
  totalAssigned: number;

  /** Sum of `spent` across every envelope in this currency, capped or not.
   * Not the number to compare against totalAssigned/totalAvailable -
   * those only ever count capped envelopes, so an unlimited envelope's
   * spend would make totalSpent look inconsistent with them (e.g.
   * totalSpent exceeding totalAssigned even though every capped
   * envelope is well under its limit). Use totalSpentCapped for
   * anything shown alongside the budget figures. */
  totalSpent: number;

  /** Sum of `spent` across only the capped envelopes in this currency -
   * the portion of totalSpent that actually counts against
   * totalAssigned. */
  totalSpentCapped: number;

  /** What is still left in capped envelopes that are under their limit:
   * the sum of max(amount - spent, 0). Never negative. */
  totalAvailable: number;

  /** How far capped envelopes over their limit went past it: the sum of
   * max(spent - amount, 0). Reported apart from totalAvailable instead of
   * netted against it, so neither fact hides the other. */
  totalExceeded: number;
}

/**
 * Precomputed aggregates for the dashboard - the frontend renders this
 * directly, it doesn't recompute totals or chart data from a raw
 * envelope list.
 */
export class DashboardSummaryResponseDto {
  /** Count of envelopes - currency-agnostic, unlike `totals` below.
   * Envelope state is never date-filtered; `year` scopes only `chart`. */
  totalEnvelopes: number;

  /** One entry per currency the user has envelopes in. Empty when the
   * user has no envelopes at all. */
  totals: DashboardCurrencyTotalsDto[];

  /** Spending by month of each expense's date, most recent months,
   * chronologically ascending. */
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

  /** Distinct years the user has expenses in, DESC - for a year picker. */
  availableYears: number[];
}
