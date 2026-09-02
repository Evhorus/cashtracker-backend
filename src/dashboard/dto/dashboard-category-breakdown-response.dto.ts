import { EnvelopeCategoryDto } from '../../envelopes/dto/envelope-category.dto';

/**
 * One category's share of spending, for a single currency and period.
 *
 * `category` is null for expenses whose envelope has none set. Grouped
 * by the category itself (envelopes reference it by id) rather than by
 * a free-text label, so one category is always one row. Summed from
 * each matching expense's own date, not the envelope's - an envelope
 * can carry expenses spanning several months (see
 * DashboardRepository.withUserCurrencyAndDateRange), so this is not the
 * same as summing envelope.spent by the envelope's creation year.
 */
export class DashboardCategoryBreakdownDto {
  category: EnvelopeCategoryDto | null;

  /** Sum of the matching expenses' `amount`, in the requested currency,
   * within the requested period. */
  spent: number;

  /** How many expenses contributed - useful context for a category
   * whose total comes from many small expenses vs. one large one. */
  expenseCount: number;
}
