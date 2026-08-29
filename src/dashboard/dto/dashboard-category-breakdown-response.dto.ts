import { EnvelopeCategoryDto } from '../../envelopes/dto/envelope-category.dto';

/**
 * One category's share of spending, for a single currency.
 *
 * `category` is null for envelopes with none set. Now that envelopes
 * reference categories by id, these are grouped by the category itself
 * rather than by a free-text label, so one category is always one row.
 */
export class DashboardCategoryBreakdownDto {
  category: EnvelopeCategoryDto | null;

  /** Sum of `spent` across this category's envelopes, in the requested
   * currency. Only envelopes with spend above zero are counted, so this
   * is never 0. */
  spent: number;

  /** How many envelopes contributed - useful context for a category
   * whose total comes from many small envelopes vs. one large one. */
  envelopeCount: number;
}
