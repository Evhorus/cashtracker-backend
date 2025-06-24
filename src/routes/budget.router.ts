import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { handleInputErrors } from '../middleware/validation';
import {
  validateBudgetExist,
  validateBudgetId,
  validateBudgetInput,
} from '../middleware/budget';
const router = Router();

router.param('budgetId', validateBudgetId);
router.param('budgetId', validateBudgetExist);

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

export default router;
