import { Envelope } from '../entities/envelope.entity';
import { ExpenseResponseDto } from '../../expenses/dto/expense-response.dto';

/**
 * Response DTO for Envelope with expenses
 * Used for detail views that need expense data
 */
export class EnvelopeWithExpensesResponseDto {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  spent: number;
  category?: string;
  description?: string;
  expenses: ExpenseResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Envelope entity with expenses to response DTO
   * @param envelope Envelope entity with expenses relation loaded
   * @returns EnvelopeWithExpensesResponseDto for API response
   */
  static fromEntity(envelope: Envelope): EnvelopeWithExpensesResponseDto {
    return {
      id: envelope.id,
      name: envelope.name,
      amount: envelope.amount,
      currency: envelope.currency,
      spent: envelope.spent,
      category: envelope.category,
      description: envelope.description,
      expenses: envelope.expenses
        ? ExpenseResponseDto.fromEntities(envelope.expenses)
        : [],
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    };
  }
}
