/**
 * The grand total across every matching expense, for a single currency
 * and period - the same set of rows the category/envelope/name
 * breakdowns each group differently, collapsed to one number.
 */
export class DashboardBreakdownTotalDto {
  spent: number;

  expenseCount: number;
}
