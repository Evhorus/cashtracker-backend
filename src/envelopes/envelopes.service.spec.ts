import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EnvelopesService } from './envelopes.service';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { Envelope } from './entities/envelope.entity';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

describe('EnvelopesService', () => {
  let service: EnvelopesService;
  let repository: jest.Mocked<EnvelopesRepository>;

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
        EnvelopesService,
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
        currency: 'COP',
        category: 'Food',
        description: 'Monthly groceries',
      };
      repository.create.mockResolvedValue(mockEnvelope);

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

    it('should create an envelope without an amount (no spending limit)', async () => {
      // Arrange
      const userId = 'user-123';
      const createDto = {
        name: 'Unlimited Tracking',
        currency: 'COP',
      };
      repository.create.mockResolvedValue({
        ...mockEnvelope,
        amount: null,
      });

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
    it('should return envelopes without expenses', async () => {
      // Arrange
      const userId = 'user-123';
      repository.findByUserIdLight.mockResolvedValue([[mockEnvelope], 1]);

      // Act
      const result = await service.findAllLight(userId);

      // Assert
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).not.toHaveProperty('userId'); // DTO doesn't expose userId
      expect(repository.findByUserIdLight).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no envelopes found', async () => {
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
    it('should return envelopes with expenses', async () => {
      // Arrange
      const userId = 'user-123';
      const envelopeWithExpenses = { ...mockEnvelope, expenses: [] };
      repository.findByUserIdWithExpenses.mockResolvedValue([
        [envelopeWithExpenses],
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
      expect(result).toEqual({ message: 'Presupuesto Actualizado' });
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
