import type { Request, Response } from 'express';
import Expense from '../models/expense.model';

export class ExpensesController {
  static create = async (req: Request, res: Response) => {
    try {
      const expense = await Expense.create(req.body);
      expense.budgetId = req.budget.id;
      await expense.save();
      res.status(201).json('Expense added successfully');
    } catch (error) {
      // console.log(error);
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static getById = async (req: Request, res: Response) => {
    res.json(req.expense);
  };

  static updateById = async (req: Request, res: Response) => {
    await req.expense.update(req.body);
    res.json('Expense updated successfully');
  };

  static deleteById = async (req: Request, res: Response) => {
    await req.expense.destroy();
    res.json('Expense deleted successfully');
  };
}
