import { Budget } from '../entities/budget.entity';
import { ExpenseResponseDto } from './expense-response.dto';

/**
 * Response DTO for Budget with expenses
 * Used for detail views that need expense data
 */
export class BudgetWithExpensesResponseDto {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category?: string;
  description?: string;
  expenses: ExpenseResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Budget entity with expenses to response DTO
   * @param budget Budget entity with expenses relation loaded
   * @returns BudgetWithExpensesResponseDto for API response
   */
  static fromEntity(budget: Budget): BudgetWithExpensesResponseDto {
    return {
      id: budget.id,
      name: budget.name,
      amount: budget.amount,
      spent: budget.spent,
      category: budget.category,
      description: budget.description,
      expenses: budget.expenses
        ? ExpenseResponseDto.fromEntities(budget.expenses)
        : [],
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
