import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvelopesRepository } from './envelopes.repository';
import { Envelope } from '../entities/envelope.entity';
import { ENVELOPE_WARNING_THRESHOLD } from '../utils/envelope-status';

describe('EnvelopesRepository', () => {
  let repository: EnvelopesRepository;
  let mockRepository: jest.Mocked<Repository<Envelope>>;

  const mockEnvelope: Envelope = {
    id: 'envelope-123',
    name: 'Groceries',
    amount: 500,
    currency: 'COP',
    spent: 200,
    userId: 'user-123',
    category: 'Food',
    description: 'Monthly groceries',
    expenses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Chainable createQueryBuilder mock - each method returns `this` like the
  // real QueryBuilder, so findByUserIdLight's chained calls resolve to it.
  let mockQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    // Create mock repository
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mockRepository = {
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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
        EnvelopesRepository,
        {
          provide: getRepositoryToken(Envelope),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<EnvelopesRepository>(EnvelopesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserIdLight', () => {
    it('should find a page of envelopes without expenses', async () => {
      // Arrange
      const userId = 'user-123';
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      const result = await repository.findByUserIdLight(userId, 1, 20);

      // Assert
      expect(result).toEqual([[mockEnvelope], 1]);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'envelope',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'envelope.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'envelope.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should compute the correct offset for page 3', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      await repository.findByUserIdLight('user-123', 3, 20);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should filter by search term across name and category', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20, {
        search: 'grocer',
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(envelope.name) LIKE LOWER(:search) OR LOWER(envelope.category) LIKE LOWER(:search))',
        { search: '%grocer%' },
      );
    });

    it('should filter by derived status in SQL, not in memory', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20, {
        status: 'alert',
      });

      // Assert - the threshold arrives as a parameter, never inlined, so
      // it cannot drift from ENVELOPE_WARNING_THRESHOLD.
      const calls = mockQueryBuilder.andWhere.mock.calls as [
        string,
        Record<string, unknown>?,
      ][];
      const alertCall = calls.find(([clause]) =>
        clause.includes('warningThreshold'),
      );
      expect(alertCall).toBeDefined();
      expect(alertCall?.[1]).toEqual({
        warningThreshold: ENVELOPE_WARNING_THRESHOLD,
      });
    });

    it('should filter unlimited envelopes on amount IS NULL', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20, {
        status: 'unlimited',
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(envelope.amount IS NULL)',
        {},
      );
    });

    it('should combine search and status rather than replacing one', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20, {
        search: 'grocer',
        status: 'exceeded',
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });

    it('should add no status clause for "all"', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20, { status: 'all' });

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not filter when search is omitted', async () => {
      // Arrange
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await repository.findByUserIdLight('user-123', 1, 20);

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find envelope by id', async () => {
      // Arrange
      const id = 'envelope-123';
      mockRepository.findOneBy.mockResolvedValue(mockEnvelope);

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toEqual(mockEnvelope);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id });
    });

    it('should return null if envelope not found', async () => {
      // Arrange
      mockRepository.findOneBy.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new envelope', async () => {
      // Arrange
      const envelopeData = {
        name: 'New Envelope',
        amount: 1000,
        currency: 'COP',
        spent: 0,
        userId: 'user-123',
      };
      mockRepository.create.mockReturnValue(mockEnvelope);
      mockRepository.save.mockResolvedValue(mockEnvelope);

      // Act
      const result = await repository.create(envelopeData);

      // Assert
      expect(result).toEqual(mockEnvelope);
      expect(mockRepository.create).toHaveBeenCalledWith(envelopeData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockEnvelope);
    });
  });

  describe('incrementSpent', () => {
    it('should increment spent amount', async () => {
      // Arrange
      const id = 'envelope-123';
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
      const id = 'envelope-123';
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
