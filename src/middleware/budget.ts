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
    .withMessage('ID no válido')
    .custom((value) => value > 0)
    .withMessage('ID no válido')
    .run(req);

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateBudgetExist = async (
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
    res.json(budget);

    req.budget = budget;

    next();
  } catch (error) {
    // console.log(error)
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
    .withMessage('El nombre del presupuesto no puede ir vació')
    .run(req);
  await body('amount')
    .notEmpty()
    .withMessage('La cantidad del presupuesto no puede ir vació')
    .isNumeric()
    .withMessage('Cantidad no válida')
    .custom((value) => value > 0)
    .withMessage('El presupuesto debe ser mayor a 0')
    .run(req);

  next();
};
