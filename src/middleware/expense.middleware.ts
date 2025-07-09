import type { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import Expense from '../models/expense.model';

declare global {
  namespace Express {
    interface Request {
      expense?: Expense;
    }
  }
}

export const validateExpenseId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await param('expenseId')
    .isInt()
    .withMessage('Invalid ID')
    .custom((value) => value > 0)
    .withMessage('Invalid ID')
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateExpenseExists = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findByPk(expenseId);

    if (!expense) {
      const error = new Error('Expense not found');
      res.status(404).json({ error: error.message });
      return;
    }
    req.expense = expense;

    next();
  } catch (error) {
    res.status(500).json({ error: 'There was an error' });
  }
};

export const validateExpenseInput = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await body('name')
    .notEmpty()
    .withMessage('Expense name cannot be empty')
    .run(req);
  await body('amount')
    .notEmpty()
    .withMessage('Expense amount cannot be empty')
    .isNumeric()
    .withMessage('Invalid amount')
    .custom((value) => value > 0)
    .withMessage('Expense must be greater than 0')
    .run(req);

  next();
};

export const belongsToBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.budget.id !== req.expense.budgetId) {
    const error = new Error('Invalid action');
    res.status(403).json({ error: error.message });
    return;
  }
  next();
};
