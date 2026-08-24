import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RecentExpensesQueryDto {
  /** How many recent expenses to return, most recent first. Defaults to
   * 5 - see DashboardService.RECENT_EXPENSES_DEFAULT_LIMIT. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
