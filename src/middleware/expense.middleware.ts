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



export const validateExpenseExist = async (
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
    // console.log(error)
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
    .withMessage('El nombre del gasto no puede ir vació')
    .run(req);
  await body('amount')
    .notEmpty()
    .withMessage('La cantidad del gasto no puede ir vació')
    .isNumeric()
    .withMessage('Cantidad no válida')
    .custom((value) => value > 0)
    .withMessage('El gasto debe ser mayor a 0')
    .run(req);

  next();
};
