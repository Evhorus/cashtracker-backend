import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ExpensesReportQueryDto } from './dto/expenses-report-query.dto';
import { ExpensesReportService } from './expenses-report.service';

/** Not nested under an envelope: a report spans all of them. Ownership
 * is the query's own `envelope.userId` filter, so it needs no guard. */
@Controller('expenses')
export class ExpensesReportController {
  constructor(private readonly reportService: ExpensesReportService) {}

  @Get('report')
  getReport(
    @CurrentUser('id') userId: string,
    @Query() query: ExpensesReportQueryDto,
  ) {
    return this.reportService.getReport(userId, query);
  }
}
