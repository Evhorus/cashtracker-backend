import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Currency } from 'src/common/enums/currency.enum';

export class DashboardQueryDto {
  /**
   * Restrict the summary to envelopes created in this calendar year.
   * Omitted = all-time (every envelope the user has, regardless of when
   * it was created).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  /**
   * Which currency the monthly chart is scoped to - the chart sums one
   * currency at a time (see DashboardChartEntryDto), same reasoning as
   * `totals`. Omitted, or a currency the user has no envelopes in,
   * falls back to the user's most-used currency (see
   * DashboardService.getSummary) - the actual currency used comes back
   * as `chartCurrency` in the response either way.
   */
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
