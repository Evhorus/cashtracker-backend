import { Injectable } from '@nestjs/common';
import { PaymentMethodsRepository } from '../payment-methods/repositories/payment-methods.repository';
import { ExpensesReportQueryDto } from './dto/expenses-report-query.dto';
import {
  ExpensesReportResponseDto,
  ReportExpenseDto,
} from './dto/expenses-report-response.dto';
import { ExpensesRepository } from './repositories/expenses.repository';
import { resolveReportScopes } from './utils/report-scopes';

/**
 * Expenses across all of a user's envelopes, filtered by payment method
 * and period - the "what did I pay with this card" view, which no
 * single envelope can answer.
 */
@Injectable()
export class ExpensesReportService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly paymentMethodsRepository: PaymentMethodsRepository,
  ) {}

  async getReport(
    userId: string,
    query: ExpensesReportQueryDto,
  ): Promise<ExpensesReportResponseDto> {
    const userMethods =
      await this.paymentMethodsRepository.findAllForUser(userId);
    const scopes = resolveReportScopes(query, userMethods);

    // An empty scope list would match every expense in the query; it
    // means the selection matched nothing.
    if (scopes.length === 0) return ExpensesReportResponseDto.empty();

    const [expenses, totalsByCurrency, totalsByPaymentMethod] =
      await Promise.all([
        this.expensesRepository.findForReport(userId, scopes),
        this.expensesRepository.sumForReportByCurrency(userId, scopes),
        this.expensesRepository.sumForReport(userId, scopes),
      ]);

    return {
      scopes,
      expenses: expenses.map((expense) => ReportExpenseDto.fromEntity(expense)),
      totalsByCurrency,
      totalsByPaymentMethod,
    };
  }
}
