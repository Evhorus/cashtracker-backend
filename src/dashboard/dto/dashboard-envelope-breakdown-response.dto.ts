/**
 * One envelope's share of spending, for a single currency and period.
 * Summed from each matching expense's own date, same reasoning as
 * DashboardCategoryBreakdownDto.
 */
export class DashboardEnvelopeBreakdownDto {
  envelopeId: string;

  envelopeName: string;

  /** Sum of the matching expenses' `amount`, in the requested currency,
   * within the requested period. */
  spent: number;

  /** How many expenses contributed. */
  expenseCount: number;
}
