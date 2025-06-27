import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { handleInputErrors } from '../middleware/validation.middleware';
import {
  hasAccess,
  validateBudgetExist,
  validateBudgetId,
  validateBudgetInput,
} from '../middleware/budget.middleware';
import { ExpensesController } from '../controllers/expense.controller';
import {
  validateExpenseExist,
  validateExpenseId,
  validateExpenseInput,
} from '../middleware/expense.middleware';
import { authenticate } from '../middleware/auth.middleware';
const router = Router();

router.use(authenticate);
router.param('budgetId', validateBudgetId);
router.param('budgetId', validateBudgetExist);
router.param('budgetId', hasAccess);

router.param('expenseId', validateExpenseId);
router.param('expenseId', validateExpenseExist);

router.get('/', BudgetController.getAll);

router.post(
  '/',
  validateBudgetInput,
  handleInputErrors,
  BudgetController.create,
);
router.get('/:budgetId', BudgetController.getById);
router.put(
  '/:budgetId',
  validateBudgetExist,
  validateBudgetInput,
  handleInputErrors,
  BudgetController.updateById,
);
router.delete('/:budgetId', BudgetController.deleteById);

/** Routes for expenses */
// https://en.wikipedia.org/wiki/Resource-oriented_architecture
// /api/budgets/10/expenses (post) -> Pattern ROA

router.post(
  '/:budgetId/expenses',
  validateExpenseInput,
  handleInputErrors,
  ExpensesController.create,
);
router.get('/:budgetId/expenses/:expenseId', ExpensesController.getById);
router.put(
  '/:budgetId/expenses/:expenseId',
  validateExpenseInput,
  handleInputErrors,
  ExpensesController.updateById,
);
router.delete('/:budgetId/expenses/:expenseId', ExpensesController.deleteById);

export default router;
