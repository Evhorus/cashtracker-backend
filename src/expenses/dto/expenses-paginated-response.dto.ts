import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/common/dto/paginated-response.dto';
import { ExpenseResponseDto } from './expense-response.dto';

/**
 * Adds `totalAmount` to the shared pagination meta - the sum of `amount`
 * over the full filtered set (search/date-range), not just the current
 * page. Kept expense-specific rather than added to `PaginationMetaDto`
 * itself, since envelopes and other paginated lists don't have an
 * equivalent "total of this filtered slice" to report.
 */
export class ExpensesPaginationMetaDto extends PaginationMetaDto {
  totalAmount: number;

  constructor(total: number, page: number, limit: number, totalAmount: number) {
    super(total, page, limit);
    this.totalAmount = totalAmount;
  }
}

export class ExpensesPaginatedResponseDto extends PaginatedResponseDto<ExpenseResponseDto> {
  declare meta: ExpensesPaginationMetaDto;

  constructor(
    data: ExpenseResponseDto[],
    total: number,
    page: number,
    limit: number,
    totalAmount: number,
  ) {
    super(data, total, page, limit);
    this.meta = new ExpensesPaginationMetaDto(total, page, limit, totalAmount);
  }
}
