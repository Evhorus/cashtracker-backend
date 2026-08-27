import { Category } from '../entities/category.entity';

declare global {
  namespace Express {
    interface Request {
      category?: Category;
    }
  }
}
