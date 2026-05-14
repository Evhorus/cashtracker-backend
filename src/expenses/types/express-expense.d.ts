import { Expense } from '../entities/expense.entity';

declare global {
  namespace Express {
    interface Request {
      expense?: Expense;
    }
  }
}
