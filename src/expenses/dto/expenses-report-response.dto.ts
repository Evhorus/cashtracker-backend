import { Expense } from '../entities/expense.entity';
import { ExpensePaymentMethodDto } from '../../payment-methods/dto/payment-method-response.dto';
import type { ReportTotalRow } from '../repositories/expenses.repository';
import type { ReportScope } from '../utils/report-scopes';

/** An expense in a report: like ExpenseResponseDto, plus the envelope it
 * belongs to, since a report crosses envelopes. */
export class ReportExpenseDto {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  description?: string;
  envelope: { id: string; name: string };
  paymentMethod: ExpensePaymentMethodDto | null;

  static fromEntity(expense: Expense): ReportExpenseDto {
    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      description: expense.description,
      envelope: {
        id: expense.envelopeId,
        name: expense.envelope?.name ?? '',
      },
      paymentMethod: ExpensePaymentMethodDto.fromEntity(expense.paymentMethod),
    };
  }
}

export class ExpensesReportResponseDto {
  /** The date range used for each payment method (null = without one),
   * so the page can say which statement period it is showing. */
  scopes: ReportScope[];
  expenses: ReportExpenseDto[];
  /** One total per currency: money in different currencies never adds. */
  totalsByCurrency: { currency: string; total: number }[];
  /** Subtotals per payment method and currency, for the split view. */
  totalsByPaymentMethod: ReportTotalRow[];

  static empty(): ExpensesReportResponseDto {
    return {
      scopes: [],
      expenses: [],
      totalsByCurrency: [],
      totalsByPaymentMethod: [],
    };
  }
}
