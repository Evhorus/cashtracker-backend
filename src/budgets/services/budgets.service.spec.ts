import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsRepository } from '../repositories/budgets.repository';
import { Budget } from '../entities/budget.entity';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let repository: jest.Mocked<BudgetsRepository>;

  const mockBudget: Budget = {
    id: 'budget-123',
    name: 'Groceries',
    amount: 500,
    spent: 200,
    userId: 'user-123',
    category: 'Food',
    description: 'Monthly groceries',
    expenses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock repository
    const mockRepo = {
      create: jest.fn(),
      findByUserIdLight: jest.fn(),
      findByUserIdWithExpenses: jest.fn(),
      findById: jest.fn(),
      findByIdWithExpenses: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: BudgetsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    repository = module.get(BudgetsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = {
        name: 'Groceries',
        amount: 500,
        category: 'Food',
        description: 'Monthly groceries',
      };
      repository.create.mockResolvedValue(mockBudget);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toEqual({ message: 'Presupuesto creado' });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        spent: 0,
        userId,
      });
    });
  });

  describe('findAllLight', () => {
    it('should return budgets without expenses', async () => {
      // Arrange
      const userId = 'user-123';
      repository.findByUserIdLight.mockResolvedValue([[mockBudget], 1]);

      // Act
      const result = await service.findAllLight(userId);

      // Assert
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
      expect(repository.findByUserIdLight).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no budgets found', async () => {
      // Arrange
      repository.findByUserIdLight.mockResolvedValue([[], 0]);

      // Act
      const result = await service.findAllLight('user-123');

      // Assert
      expect(result.count).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return budgets with expenses', async () => {
      // Arrange
      const userId = 'user-123';
      const budgetWithExpenses = { ...mockBudget, expenses: [] };
      repository.findByUserIdWithExpenses.mockResolvedValue([
        [budgetWithExpenses],
        1,
      ]);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(repository.findByUserIdWithExpenses).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    it('should return a budget by id', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockBudget);

      // Act
      const result = await service.findOne('budget-123');

      // Assert
      expect(result).toEqual(mockBudget);
      expect(repository.findById).toHaveBeenCalledWith('budget-123');
    });

    it('should throw NotFoundException when budget not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND),
      );
    });
  });

  describe('findOnePlain', () => {
    it('should return budget with expenses', async () => {
      // Arrange
      const budgetWithExpenses = { ...mockBudget, expenses: [] };
      repository.findByIdWithExpenses.mockResolvedValue(budgetWithExpenses);

      // Act
      const result = await service.findOnePlain('budget-123');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('expenses');
      expect(repository.findByIdWithExpenses).toHaveBeenCalledWith(
        'budget-123',
      );
    });

    it('should throw NotFoundException when budget not found', async () => {
      // Arrange
      repository.findByIdWithExpenses.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOnePlain('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update a budget successfully', async () => {
      // Arrange
      const updateDto = { name: 'Updated Budget', amount: 600 };
      repository.findById.mockResolvedValue(mockBudget);
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // Act
      const result = await service.update('budget-123', updateDto);

      // Assert
      expect(result).toEqual({ message: 'Presupuesto Actualizado' });
      expect(repository.findById).toHaveBeenCalledWith('budget-123');
      expect(repository.update).toHaveBeenCalledWith('budget-123', updateDto);
    });

    it('should throw NotFoundException when budget not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND));
    });
  });

  describe('remove', () => {
    it('should remove a budget successfully', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockBudget);
      repository.remove.mockResolvedValue(mockBudget);

      // Act
      const result = await service.remove('budget-123');

      // Assert
      expect(result).toEqual(mockBudget);
      expect(repository.findById).toHaveBeenCalledWith('budget-123');
      expect(repository.remove).toHaveBeenCalledWith(mockBudget);
    });

    it('should throw NotFoundException when budget not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.BUDGET_NOT_FOUND),
      );
    });
  });
});
