import { Expense } from '../entities/expense.entity';

/**
 * Response DTO for Expense entity
 * Controls what data is exposed to the client
 */
export class ExpenseResponseDto {
  id: string;
  name: string;
  amount: number;
  date: Date;
  description?: string;
  budgetId: string; // Needed for guard validation
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Expense entity to response DTO
   * @param expense Expense entity from database
   * @returns ExpenseResponseDto for API response
   */
  static fromEntity(expense: Expense): ExpenseResponseDto {
    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      budgetId: expense.budgetId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  /**
   * Transform array of Expense entities to response DTOs
   * @param expenses Array of Expense entities
   * @returns Array of ExpenseResponseDto
   */
  static fromEntities(expenses: Expense[]): ExpenseResponseDto[] {
    return expenses.map((expense) => this.fromEntity(expense));
  }
}
