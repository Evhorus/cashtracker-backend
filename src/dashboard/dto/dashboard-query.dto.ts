import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
