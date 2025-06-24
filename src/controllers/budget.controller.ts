import type { Request, Response } from 'express';
import Budget from '../models/budget.model';

export class BudgetController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const budget = await Budget.findAll({
        order: [['createdAt', 'DESC']],
        //TODO: Filtrar por el usuario autenticado
      });

      res.json(budget);
    } catch (error) {
      // console.log(error)
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const budget = new Budget(req.body);
      await budget.save();
      res.status(201).json('Budget created successfully');
    } catch (error) {
      // console.log(error)
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static getById = async (req: Request, res: Response) => {
    res.json(req.budget);
  };

  static updateById = async (req: Request, res: Response) => {
    await req.budget.update(req.body);
    res.json('Budget updated successfully');
  };

  static deleteById = async (req: Request, res: Response) => {
    await req.budget.destroy();
    res.json('Budget deleted successfully');
  };
}
