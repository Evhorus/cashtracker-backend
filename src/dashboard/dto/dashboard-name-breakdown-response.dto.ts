/**
 * One expense name's share of spending, for a single currency and
 * period - groups recurring expenses (e.g. "Arriendo" paid every
 * month) into a single row. Names are already normalized on save (see
 * CreateExpenseDto/UpdateExpenseDto's `normalizeString`), so this
 * groups on the exact stored string with no further merging needed.
 */
export class DashboardNameBreakdownDto {
  name: string;

  /** Sum of the matching expenses' `amount`, in the requested currency,
   * within the requested period. */
  spent: number;

  /** How many expenses share this name. */
  expenseCount: number;
}
