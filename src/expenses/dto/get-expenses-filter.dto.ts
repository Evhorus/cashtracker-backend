import { IsOptional, IsString, IsIn } from 'class-validator';
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
}
