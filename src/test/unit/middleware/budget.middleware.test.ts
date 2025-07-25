import { createRequest, createResponse } from 'node-mocks-http';
import {
  hasAccess,
  validateBudgetExists,
} from '../../../middleware/budget.middleware';
import Budget from '../../../models/budget.model';
import { budgets } from '../../mocks/budgets';

jest.mock('../../../models/budget.model', () => ({
  findByPk: jest.fn(),
}));

describe('budget.middleware - validateBudgetExists', () => {
  it('should handle non-existent budget', async () => {
    (Budget.findByPk as jest.Mock).mockResolvedValue(null);
    const req = createRequest({
      params: {
        budgetId: 1,
      },
    });

    const res = createResponse();

    const next = jest.fn();

    await validateBudgetExists(req, res, next);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(404);
    expect(data).toEqual({ error: 'Budget not found' });
    expect(next).not.toHaveBeenCalled();
  });
  it('Should proceed to next middleware if budget exists', async () => {
    (Budget.findByPk as jest.Mock).mockResolvedValue(budgets[0]);
    const req = createRequest({
      params: {
        budgetId: 1,
      },
    });

    const res = createResponse();

    const next = jest.fn();

    await validateBudgetExists(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.budget).toEqual(budgets[0]);
  });

  it('should handle internal server error', async () => {
    (Budget.findByPk as jest.Mock).mockRejectedValue(new Error());
    const req = createRequest({
      params: {
        budgetId: 1,
      },
    });

    const res = createResponse();

    const next = jest.fn();

    await validateBudgetExists(req, res, next);

    const data = res._getJSONData();

    expect(res.statusCode).toBe(500);
    expect(data).toEqual({ error: 'There was an error' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('budget.middleware - hasAccess', () => {
  it('should call next() if user has access to budget', () => {
    const req = createRequest({
      budget: budgets[0],
      user: { id: 1 },
    });

    const res = createResponse();

    const next = jest.fn();

    hasAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
  it('should return 401 error if userId does not have access to budget', () => {
    const req = createRequest({
      budget: budgets[0],
      user: { id: 2 },
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
