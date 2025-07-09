import { createRequest, createResponse } from 'node-mocks-http';
import Expense from '../../../models/expense.model';
import { validateExpenseExists } from '../../../middleware/expense.middleware';
import { expenses } from '../../mocks/expenses';
import { hasAccess } from '../../../middleware/budget.middleware';
import { budgets } from '../../mocks/budgets';

jest.mock('../../../models/expense.model', () => ({
  findByPk: jest.fn(),
}));

describe('Expenses Middleware - validateExpenseExists', () => {
  beforeEach(() => {
    (Expense.findByPk as jest.Mock).mockImplementation((expenseId) => {
      const expense = expenses.filter((e) => e.id === expenseId)[0] ?? null;
      return Promise.resolve(expense);
    });
  });

  it('should handle a non-existent expense', async () => {
    const req = createRequest({
      params: { expenseId: 120 },
    });
    const res = createResponse();
    const next = jest.fn();

    await validateExpenseExists(req, res, next);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(404);
    expect(data).toEqual({ error: 'Expense not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next middleware if expense exists', async () => {
    const req = createRequest({
      params: { expenseId: 1 },
    });
    const res = createResponse();
    const next = jest.fn();

    await validateExpenseExists(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.expense).toEqual(expenses[0]);
  });

  it('should handle internal server error', async () => {
    (Expense.findByPk as jest.Mock).mockRejectedValue(new Error());
    const req = createRequest({
      params: { expenseId: 1 },
    });
    const res = createResponse();
    const next = jest.fn();

    await validateExpenseExists(req, res, next);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
    expect(data).toEqual({ error: 'There was an error' });
  });

  it('should prevent unauthorized users from adding expenses', async () => {
    const req = createRequest({
      method: 'POST',
      url: '/api/budgets/:budgetId/expenses',
      budget: budgets[0],
      user: { id: 20 },
      body: { name: 'Expense test', amount: 3000 },
    });
    const res = createResponse();
    const next = jest.fn();

    hasAccess(req, res, next);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(data).toEqual({ error: 'Invalid action' });
  });
});
