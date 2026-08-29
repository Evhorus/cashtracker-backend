/**
 * One category's share of spending, for a single currency.
 *
 * `category` is the envelope's free-text category, or `null` for
 * envelopes with none set - it is not a foreign key, so these are
 * grouped by the text as stored. Clients resolve that text to an icon
 * and colour themselves, and label `null` however they like ("Sin
 * categoría" in the web app).
 */
export class DashboardCategoryBreakdownDto {
  category: string | null;

  /** Sum of `spent` across this category's envelopes, in the requested
   * currency. Only envelopes with spend above zero are counted, so this
   * is never 0. */
  spent: number;

  /** How many envelopes contributed - useful context for a category
   * whose total comes from many small envelopes vs. one large one. */
  envelopeCount: number;
}
