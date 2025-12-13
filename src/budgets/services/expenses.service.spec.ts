import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from '../repositories/expenses.repository';
import { BudgetsRepository } from '../repositories/budgets.repository';
import { Expense } from '../entities/expense.entity';
import { Budget } from '../entities/budget.entity';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expensesRepository: jest.Mocked<ExpensesRepository>;
  let budgetsRepository: jest.Mocked<BudgetsRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockExpense: Expense = {
    id: 'expense-123',
    name: 'Walmart',
    amount: 50,
    date: new Date('2024-01-15'),
    description: 'Weekly groceries',
    budgetId: 'budget-123',
    budget: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBudget: Budget = {
    id: 'budget-123',
    name: 'Groceries',
    amount: 500,
    spent: 200,
    userId: 'user-123',
    category: 'Food',
    description: null,
    expenses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create mocks
    const mockExpensesRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockBudgetsRepo = {
      incrementSpent: jest.fn(),
      decrementSpent: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn((callback) => callback({})), // Execute callback immediately
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: ExpensesRepository,
          useValue: mockExpensesRepo,
        },
        {
          provide: BudgetsRepository,
          useValue: mockBudgetsRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expensesRepository = module.get(ExpensesRepository);
    budgetsRepository = module.get(BudgetsRepository);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an expense and increment budget spent', async () => {
      // Arrange
      const budgetId = 'budget-123';
      const createDto = {
        name: 'Walmart',
        amount: 50,
        date: new Date('2024-01-15'),
        description: 'Weekly groceries',
      };
      expensesRepository.create.mockResolvedValue(mockExpense);

      // Act
      const result = await service.create(budgetId, createDto);

      // Assert
      expect(result).toEqual({ message: 'Gasto creado' });
      expect(expensesRepository.create).toHaveBeenCalledWith(
        {
          ...createDto,
          budgetId,
        },
        {},
      );
      expect(budgetsRepository.incrementSpent).toHaveBeenCalledWith(
        budgetId,
        50,
      );
    });
  });

  describe('findOne', () => {
    it('should return expense DTO', async () => {
      // Arrange
      expensesRepository.findById.mockResolvedValue(mockExpense);

      // Act
      const result = await service.findOne('expense-123');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).not.toHaveProperty('budget'); // DTO doesn't include relation
      expect(expensesRepository.findById).toHaveBeenCalledWith('expense-123');
    });

    it('should throw NotFoundException when expense not found', async () => {
      // Arrange
      expensesRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
    });
  });

  describe('findOneInternal', () => {
    it('should return expense entity for internal use', async () => {
      // Arrange
      expensesRepository.findById.mockResolvedValue(mockExpense);

      // Act
      const result = await service.findOneInternal('expense-123');

      // Assert
      expect(result).toEqual(mockExpense); // Returns entity, not DTO
      expect(result).toHaveProperty('budgetId');
    });

    it('should throw NotFoundException when expense not found', async () => {
      // Arrange
      expensesRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOneInternal('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update expense and adjust budget spent', async () => {
      // Arrange
      const updateDto = { amount: 75 }; // Increase by 25
      expensesRepository.findById.mockResolvedValue(mockExpense); // amount: 50
      expensesRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.update({
        budget: mockBudget,
        expenseId: 'expense-123',
        updateExpenseDto: updateDto,
      });

      // Assert
      expect(result).toEqual({ message: 'Gasto actualizado' });
      expect(expensesRepository.update).toHaveBeenCalledWith(
        'expense-123',
        updateDto,
        {},
      );
      expect(budgetsRepository.incrementSpent).toHaveBeenCalledWith(
        'budget-123',
        25, // difference
      );
    });

    it('should not update budget if amount unchanged', async () => {
      // Arrange
      const updateDto = { name: 'Updated name' }; // No amount change
      expensesRepository.findById.mockResolvedValue(mockExpense);

      // Act
      await service.update({
        budget: mockBudget,
        expenseId: 'expense-123',
        updateExpenseDto: updateDto,
      });

      // Assert
      expect(budgetsRepository.incrementSpent).not.toHaveBeenCalled();
      expect(budgetsRepository.decrementSpent).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete expense and decrement budget spent', async () => {
      // Arrange
      expensesRepository.findById.mockResolvedValue(mockExpense);
      expensesRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.remove(mockBudget, 'expense-123');

      // Assert
      expect(result).toEqual({ message: 'Gasto eliminado' });
      expect(expensesRepository.delete).toHaveBeenCalledWith('expense-123', {});
      expect(budgetsRepository.decrementSpent).toHaveBeenCalledWith(
        'budget-123',
        50,
      );
    });
  });
});
