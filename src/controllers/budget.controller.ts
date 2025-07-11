import type { Request, Response } from 'express';
import Budget from '../models/budget.model';
import Expense from '../models/expense.model';

export class BudgetController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const budgets = await Budget.findAll({
        order: [['createdAt', 'DESC']],
        where: { userId: req.user.id },
      });

      res.json(budgets);
    } catch (error) {
      // console.log(error)
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const budget = await Budget.create(req.body);
      budget.userId = req.user.id;
      await budget.save();
      res.status(201).json('Budget created successfully');
    } catch (error) {
      // console.log(error)
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static getById = async (req: Request, res: Response) => {
    const budgetWithExpenses = await Budget.findByPk(req.budget.id, {
      include: [Expense],
    });
    res.json(budgetWithExpenses);
  };

  static updateById = async (req: Request, res: Response) => {
    await req.budget.update(req.body);
    console.log(req.body);
    res.json('Budget updated successfully');
  };

  static deleteById = async (req: Request, res: Response) => {
    await req.budget.destroy();
    res.json('Budget deleted successfully');
  };
}
