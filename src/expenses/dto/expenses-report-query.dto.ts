import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import {
  IsCalendarDate,
  IsNotBefore,
} from 'src/common/validators/calendar-date.validators';

export const REPORT_PERIODS = ['month', 'cycle', 'custom'] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/** `?paymentMethodIds=a,b` and `?paymentMethodIds=a&paymentMethodIds=b`
 * both arrive as an array. */
function toList(value: unknown): unknown {
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value === 'string') return value.split(',').filter(Boolean);
  return value;
}

/**
 * Expenses across every envelope of the user, for one period.
 *
 * Selecting nothing (no ids and no `includeUnassigned`) means every
 * expense; otherwise only the selected payment methods, plus expenses
 * without one when `includeUnassigned` is set.
 *
 * `period`:
 * - `month`: the calendar month `month` for everything.
 * - `cycle`: each credit card with a cut day uses its own statement
 *   period closing in `month`; everything else uses the calendar month.
 * - `custom`: `startDate` to `endDate` for everything.
 */
export class ExpensesReportQueryDto {
  @IsOptional()
  @Transform(({ value }) => toList(value))
  @IsArray()
  @IsUUID('all', { each: true })
  paymentMethodIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeUnassigned?: boolean;

  @IsIn(REPORT_PERIODS)
  period: ReportPeriod;

  @ValidateIf((query: ExpensesReportQueryDto) => query.period !== 'custom')
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: ERROR_MESSAGES.INVALID_MONTH_FORMAT,
  })
  month?: string;

  @ValidateIf((query: ExpensesReportQueryDto) => query.period === 'custom')
  @IsCalendarDate()
  startDate?: string;

  @ValidateIf((query: ExpensesReportQueryDto) => query.period === 'custom')
  @IsCalendarDate()
  @IsNotBefore('startDate')
  endDate?: string;
}
