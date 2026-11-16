import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { toBoolean, toStringList } from 'src/common/utils/query-transforms';
import {
  IsCalendarDate,
  IsNotBefore,
} from 'src/common/validators/calendar-date.validators';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class GetExpensesFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsCalendarDate()
  startDate?: string;

  @IsOptional()
  @IsCalendarDate()
  @IsNotBefore('startDate')
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC';

  /** What `sort` orders by: the expense date (default) or the amount. */
  @IsOptional()
  @IsIn(['date', 'amount'])
  sortBy?: 'date' | 'amount';

  /** Only expenses paid with one of these. With `includeUnassigned`,
   * also those without a payment method. Neither set = all expenses. */
  @IsOptional()
  @Transform(({ value }) => toStringList(value))
  @IsArray()
  @IsUUID('all', { each: true })
  paymentMethodIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeUnassigned?: boolean;
}
