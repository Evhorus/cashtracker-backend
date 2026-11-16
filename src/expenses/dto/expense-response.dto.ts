import { Expense } from '../entities/expense.entity';
import { ExpensePaymentMethodDto } from '../../payment-methods/dto/payment-method-response.dto';

/**
 * Response DTO for Expense entity
 * Controls what data is exposed to the client
 */
export class ExpenseResponseDto {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: Date;
  description?: string;
  /** What it was paid with, or null. */
  paymentMethod: ExpensePaymentMethodDto | null;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Expense entity to response DTO
   */
  static fromEntity(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      description: expense.description,
      paymentMethod: ExpensePaymentMethodDto.fromEntity(expense.paymentMethod),
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  /**
   * Transform array of Expense entities to response DTOs
   */
  static fromEntities(expenses: Expense[]): ExpenseResponseDto[] {
    return expenses.map((expense) => this.fromEntity(expense));
  }
}
