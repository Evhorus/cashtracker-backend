import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnvelopesRepository } from './envelopes.repository';
import { Envelope } from '../entities/envelope.entity';

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
      mockRepository.findAndCount.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      const result = await repository.findByUserIdLight(userId, 1, 20);

      // Assert
      expect(result).toEqual([[mockEnvelope], 1]);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId },
        select: [
          'id',
          'name',
          'amount',
          'currency',
          'spent',
          'category',
          'description',
          'createdAt',
          'updatedAt',
        ],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should compute the correct offset for page 3', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await repository.findByUserIdLight('user-123', 3, 20);

      // Assert
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
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
