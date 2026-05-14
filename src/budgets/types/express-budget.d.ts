import { Budget } from '../entities/budget.entity';

declare global {
  namespace Express {
    interface Request {
      budget?: Budget;
    }
  }
}
