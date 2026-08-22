import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

/**
 * Same pattern as GetExpensesFilterDto, minus startDate/endDate/sort -
 * envelopes have no date of their own to filter or sort by.
 */
export class GetEnvelopesFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
