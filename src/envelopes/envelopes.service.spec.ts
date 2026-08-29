import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EnvelopesService } from './envelopes.service';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { Envelope } from './entities/envelope.entity';
import { Category } from '../categories/entities/category.entity';
import { Currency } from '../common/enums/currency.enum';
import { CategoriesRepository } from '../categories/repositories/categories.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

describe('EnvelopesService', () => {
  let service: EnvelopesService;
  let repository: jest.Mocked<EnvelopesRepository>;

  const mockCategory: Category = {
    id: 'cat-1',
    userId: 'user-123',
    label: 'Food',
    color: 'oklch(0.72 0.14 153)',
    icon: 'utensils',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEnvelope: Envelope = {
    id: 'envelope-123',
    name: 'Groceries',
    amount: 500,
    currency: 'COP',
    spent: 200,
    userId: 'user-123',
    category: mockCategory,
    categoryId: mockCategory.id,
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
      findById: jest.fn(),
      findByIdWithExpenses: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvelopesService,
        {
          provide: CategoriesRepository,
          useValue: {
            // Envelopes validate the category id against what the user
            // may see - see EnvelopesService.assertCategoryIsUsable.
            findVisibleForUserById: jest.fn().mockResolvedValue(mockCategory),
          },
        },
        {
          provide: EnvelopesRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<EnvelopesService>(EnvelopesService);
    repository = module.get(EnvelopesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an envelope successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = {
        name: 'Groceries',
        amount: 500,
        currency: Currency.COP,
        categoryId: mockCategory.id,
        description: 'Monthly groceries',
      };
      repository.create.mockResolvedValue(mockEnvelope);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toEqual({ message: 'Sobre creado' });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        spent: 0,
        userId,
      });
    });

    it('should create an envelope without an amount (no spending limit)', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = {
        name: 'Unlimited Tracking',
        currency: Currency.COP,
      };
      repository.create.mockResolvedValue({
        ...mockEnvelope,
        amount: null,
      });

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result).toEqual({ message: 'Sobre creado' });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        spent: 0,
        userId,
      });
    });
  });

  describe('findAllLight', () => {
    it('should return a paginated list of envelopes without expenses', async () => {
      // Arrange
      const userId = 'user-123';
      repository.findByUserIdLight.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      const result = await service.findAllLight(userId, 1, 20);

      // Assert
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      // The derived status travels with every envelope, so no client has
      // to recompute it - see utils/envelope-status.ts.
      expect(result.data[0]).toHaveProperty('status');
      expect(result.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
      expect(repository.findByUserIdLight).toHaveBeenCalledWith(
        userId,
        1,
        20,
        {},
      );
    });

    it('should pass the search term through to the repository', async () => {
      // Arrange
      repository.findByUserIdLight.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      await service.findAllLight('user-123', 1, 20, { search: 'grocer' });

      // Assert
      expect(repository.findByUserIdLight).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        { search: 'grocer' },
      );
    });

    it('should return empty data when no envelopes found', async () => {
      // Arrange
      repository.findByUserIdLight.mockResolvedValue([[], 0]);

      // Act
      const result = await service.findAllLight('user-123', 1, 20);

      // Assert
      expect(result.meta.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should compute pagination meta correctly for a middle page', async () => {
      // Arrange
      repository.findByUserIdLight.mockResolvedValue([[mockEnvelope], 45]);

      // Act
      const result = await service.findAllLight('user-123', 2, 20);

      // Assert
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return an envelope by id', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockEnvelope);

      // Act
      const result = await service.findOne('envelope-123');

      // Assert
      expect(result).toEqual(mockEnvelope);
      expect(repository.findById).toHaveBeenCalledWith('envelope-123');
    });

    it('should throw NotFoundException when envelope not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND),
      );
    });
  });

  describe('findOnePlain', () => {
    it('should return envelope with expenses', async () => {
      // Arrange
      const envelopeWithExpenses = { ...mockEnvelope, expenses: [] };
      repository.findByIdWithExpenses.mockResolvedValue(envelopeWithExpenses);

      // Act
      const result = await service.findOnePlain('envelope-123');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('expenses');
      expect(repository.findByIdWithExpenses).toHaveBeenCalledWith(
        'envelope-123',
      );
    });

    it('should throw NotFoundException when envelope not found', async () => {
      // Arrange
      repository.findByIdWithExpenses.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOnePlain('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND),
      );
    });
  });

  describe('update', () => {
    it('should update an envelope successfully', async () => {
      // Arrange
      const updateDto = { name: 'Updated Envelope', amount: 600 };
      repository.findById.mockResolvedValue(mockEnvelope);
      repository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      // Act
      const result = await service.update('envelope-123', updateDto);

      // Assert
      expect(result).toEqual({ message: 'Sobre actualizado' });
      expect(repository.findById).toHaveBeenCalledWith('envelope-123');
      expect(repository.update).toHaveBeenCalledWith('envelope-123', updateDto);
    });

    it('should throw NotFoundException when envelope not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', { name: 'Test' }),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND),
      );
    });
  });

  describe('remove', () => {
    it('should remove an envelope successfully', async () => {
      // Arrange
      repository.findById.mockResolvedValue(mockEnvelope);
      repository.remove.mockResolvedValue(mockEnvelope);

      // Act
      const result = await service.remove('envelope-123');

      // Assert
      expect(result).toEqual(mockEnvelope);
      expect(repository.findById).toHaveBeenCalledWith('envelope-123');
      expect(repository.remove).toHaveBeenCalledWith(mockEnvelope);
    });

    it('should throw NotFoundException when envelope not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND),
      );
    });
  });
});
