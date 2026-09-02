import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Currency } from 'src/common/enums/currency.enum';

/**
 * Shared filter shape for the four "breakdown" endpoints (category,
 * envelope, name, total) - all four group/sum the same underlying set
 * of expenses, just sliced along a different axis, so they share one
 * filter contract.
 *
 * `startDate`/`endDate` (an exact range) win over `year` (a
 * whole-calendar-year shortcut) when both are somehow present - the
 * frontend never sends both at once (picking one clears the other in
 * the URL), but an exact range is the more specific instruction either
 * way. Omitting all three means all-time.
 */
export class BreakdownQueryDto {
  /**
   * Required, unlike DashboardQueryDto's optional `currency`. That one
   * falls back to the user's most-used currency because the summary has
   * to return something sensible with no input; these endpoints are only
   * ever called with a currency the caller already resolved (the chart's
   * own `chartCurrency`), and silently picking a different one would
   * make the breakdown disagree with the rest of the page.
   */
  @IsEnum(Currency)
  currency: Currency;

  /** Restrict to expenses dated in this calendar year. Ignored when
   * startDate/endDate are present; omitted entirely = all-time. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
