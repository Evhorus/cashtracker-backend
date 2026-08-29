import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  ENVELOPE_STATUS_FILTERS,
  type EnvelopeStatusFilter,
} from '../utils/envelope-status';

/**
 * Same pattern as GetExpensesFilterDto, minus startDate/endDate/sort -
 * envelopes have no date of their own to filter or sort by.
 */
export class GetEnvelopesFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Spending-status grouping. Derived from amount/spent rather than
   * stored, but filtered in SQL all the same (see
   * buildEnvelopeStatusPredicate) so `total` stays correct and clients
   * don't have to fetch every envelope to narrow the list themselves.
   *
   * Validated against the same list the predicates are built from, so an
   * unknown value is a 400 rather than being silently ignored.
   */
  @IsOptional()
  @IsIn(ENVELOPE_STATUS_FILTERS as readonly string[])
  status?: EnvelopeStatusFilter;
}
