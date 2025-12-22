import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetsRepository } from './budgets.repository';
import { Budget } from '../entities/budget.entity';

describe('BudgetsRepository', () => {
  let repository: BudgetsRepository;
  let mockRepository: jest.Mocked<Repository<Budget>>;

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mockRepository = {
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsRepository,
        {
          provide: getRepositoryToken(Budget),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<BudgetsRepository>(BudgetsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserIdLight', () => {
    it('should find budgets without expenses', async () => {
      // Arrange
      const userId = 'user-123';
      mockRepository.findAndCount.mockResolvedValue([[mockBudget], 1]);

      // Act
      const result = await repository.findByUserIdLight(userId);

      // Assert
      expect(result).toEqual([[mockBudget], 1]);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId },
        select: [
          'id',
          'name',
          'amount',
          'spent',
          'category',
          'description',
          'createdAt',
          'updatedAt',
        ],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByUserIdWithExpenses', () => {
    it('should find budgets with expenses', async () => {
      // Arrange
      const userId = 'user-123';
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockBudget], 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      const result = await repository.findByUserIdWithExpenses(userId);

      // Assert
      expect(result).toEqual([[mockBudget], 1]);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'budget.expenses',
        'expense',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'budget.userId = :userId',
        { userId },
      );
    });
  });

  describe('findById', () => {
    it('should find budget by id', async () => {
      // Arrange
      const id = 'budget-123';
      mockRepository.findOneBy.mockResolvedValue(mockBudget);

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toEqual(mockBudget);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id });
    });

    it('should return null if budget not found', async () => {
      // Arrange
      mockRepository.findOneBy.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new budget', async () => {
      // Arrange
      const budgetData = {
        name: 'New Budget',
        amount: 1000,
        spent: 0,
        userId: 'user-123',
      };
      mockRepository.create.mockReturnValue(mockBudget);
      mockRepository.save.mockResolvedValue(mockBudget);

      // Act
      const result = await repository.create(budgetData);

      // Assert
      expect(result).toEqual(mockBudget);
      expect(mockRepository.create).toHaveBeenCalledWith(budgetData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockBudget);
    });
  });

  describe('incrementSpent', () => {
    it('should increment spent amount', async () => {
      // Arrange
      const id = 'budget-123';
      const amount = 50;

      // Act
      await repository.incrementSpent(id, amount);

      // Assert
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id },
        'spent',
        amount,
      );
    });
  });

  describe('decrementSpent', () => {
    it('should decrement spent amount', async () => {
      // Arrange
      const id = 'budget-123';
      const amount = 30;

      // Act
      await repository.decrementSpent(id, amount);

      // Assert
      expect(mockRepository.decrement).toHaveBeenCalledWith(
        { id },
        'spent',
        amount,
      );
    });
  });
});
