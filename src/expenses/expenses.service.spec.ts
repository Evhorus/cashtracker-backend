import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './repositories/expenses.repository';
import { BudgetsRepository } from '../budgets/repositories/budgets.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { Budget } from '../budgets/entities/budget.entity';
import { Expense } from './entities/expense.entity';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expensesRepository: jest.Mocked<ExpensesRepository>;
  let budgetsRepository: jest.Mocked<BudgetsRepository>;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: EntityManager;

  const mockBudget: Budget = {
    id: 'budget-123',
    name: 'Groceries',
    amount: 500,
    currency: 'COP',
    spent: 0,
    userId: 'user-123',
    expenses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExpense: Expense = {
    id: 'expense-123',
    name: 'Milk',
    amount: 10,
    currency: 'COP',
    date: new Date(),
    budgetId: 'budget-123',
    budget: mockBudget,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockExpensesRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockBudgetsRepo = {
      incrementSpent: jest.fn(),
      decrementSpent: jest.fn(),
      findById: jest.fn(),
    };

    const mockEntityManager = {
      getRepository: jest.fn(),
    } as unknown as EntityManager;

    const mockDataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<any>) =>
        cb(mockEntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: ExpensesRepository, useValue: mockExpensesRepo },
        { provide: BudgetsRepository, useValue: mockBudgetsRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expensesRepository = module.get(ExpensesRepository);
    budgetsRepository = module.get(BudgetsRepository);
    dataSource = module.get(DataSource);
    entityManager = mockEntityManager;
  });

  describe('create', () => {
    it('should create an expense and increment budget spent', async () => {
      const createDto = {
        name: 'Milk',
        amount: 10,
        currency: 'COP',
        date: new Date(),
      };
      expensesRepository.create.mockResolvedValue(mockExpense);

      const result = await service.create('budget-123', createDto);

      expect(result).toEqual({ message: 'Gasto creado' });
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(expensesRepository.create).toHaveBeenCalledWith(
        { ...createDto, budgetId: 'budget-123' },
        entityManager,
      );
      expect(budgetsRepository.incrementSpent).toHaveBeenCalledWith(
        'budget-123',
        10,
        entityManager,
      );
    });
  });

  describe('remove', () => {
    it('should remove an expense and decrement budget spent', async () => {
      expensesRepository.findById.mockResolvedValue(mockExpense);

      const result = await service.remove(mockBudget, 'expense-123');

      expect(result).toEqual({ message: 'Gasto eliminado' });
      expect(budgetsRepository.decrementSpent).toHaveBeenCalledWith(
        mockBudget.id,
        mockExpense.amount,
        entityManager,
      );
    });

    it('should throw NotFoundException if expense does not exist', async () => {
      expensesRepository.findById.mockResolvedValue(null);

      await expect(service.remove(mockBudget, 'non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
    });
  });

  describe('findAll', () => {
    it('should return mapped expense responses', async () => {
      expensesRepository.findAll.mockResolvedValue([mockExpense]);

      const result = await service.findAll('budget-123', {});

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockExpense.id);
      expect(expensesRepository.findAll).toHaveBeenCalledWith('budget-123', {});
    });
  });
});
