import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Currency } from 'src/common/enums/currency.enum';

export class CategoryBreakdownQueryDto {
  /**
   * Required, unlike DashboardQueryDto's optional `currency`. That one
   * falls back to the user's most-used currency because the summary has
   * to return something sensible with no input; this endpoint is only
   * ever called with a currency the caller already resolved (the chart's
   * own `chartCurrency`), and silently picking a different one would
   * make the breakdown disagree with the chart beside it.
   */
  @IsEnum(Currency)
  currency: Currency;

  /** Restrict to envelopes created in this calendar year. Omitted =
   * all-time, matching the summary. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
