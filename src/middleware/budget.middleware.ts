import type { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import Budget from '../models/budget.model';

declare global {
  namespace Express {
    interface Request {
      budget?: Budget;
    }
  }
}

export const validateBudgetId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await param('budgetId')
    .isInt()
    .withMessage('Invalid ID')
    .bail()
    .custom((value) => value > 0)
    .withMessage('Invalid ID')
    .bail()
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateBudgetExists = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { budgetId } = req.params;
    const budget = await Budget.findByPk(budgetId);

    if (!budget) {
      const error = new Error('Budget not found');
      res.status(404).json({ error: error.message });
      return;
    }
    req.budget = budget;

    next();
  } catch (error) {
    res.status(500).json({ error: 'There was an error' });
  }
};

export const validateBudgetInput = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await body('name')
    .notEmpty()
    .withMessage('Budget name cannot be empty')
    .run(req);
  await body('amount')
    .notEmpty()
    .withMessage('Budget amount cannot be empty')
    .isNumeric()
    .withMessage('Invalid amount')
    .custom((value) => value > 0)
    .withMessage('Budget must be greater than 0')
    .run(req);

  next();
};

export const hasAccess = (req: Request, res: Response, next: NextFunction) => {
  if (req.budget.userId !== req.user.id) {
    const error = new Error('Invalid action');
    res.status(401).json({ error: error.message });
    return;
  }

  next();
};