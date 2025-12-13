import { Budget } from '../entities/budget.entity';

/**
 * Response DTO for Budget entity
 * Controls what data is exposed to the client
 */
export class BudgetResponseDto {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Budget entity to response DTO
   * @param budget Budget entity from database
   * @returns BudgetResponseDto for API response
   */
  static fromEntity(budget: Budget): BudgetResponseDto {
    return {
      id: budget.id,
      name: budget.name,
      amount: budget.amount,
      spent: budget.spent,
      category: budget.category,
      description: budget.description,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  /**
   * Transform array of Budget entities to response DTOs
   * @param budgets Array of Budget entities
   * @returns Array of BudgetResponseDto
   */
  static fromEntities(budgets: Budget[]): BudgetResponseDto[] {
    return budgets.map((budget) => this.fromEntity(budget));
  }
}
