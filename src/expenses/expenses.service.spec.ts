import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './repositories/expenses.repository';
import { EnvelopesRepository } from '../envelopes/repositories/envelopes.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { Envelope } from '../envelopes/entities/envelope.entity';
import { Expense } from './entities/expense.entity';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expensesRepository: jest.Mocked<ExpensesRepository>;
  let envelopesRepository: jest.Mocked<EnvelopesRepository>;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: EntityManager;

  const mockEnvelope: Envelope = {
    id: 'envelope-123',
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
    envelopeId: 'envelope-123',
    envelope: mockEnvelope,
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

    const mockEnvelopesRepo = {
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
        { provide: EnvelopesRepository, useValue: mockEnvelopesRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expensesRepository = module.get(ExpensesRepository);
    envelopesRepository = module.get(EnvelopesRepository);
    dataSource = module.get(DataSource);
    entityManager = mockEntityManager;
  });

  describe('create', () => {
    it('should create an expense and increment envelope spent', async () => {
      const createDto = {
        name: 'Milk',
        amount: 10,
        currency: 'COP',
        date: new Date(),
      };
      expensesRepository.create.mockResolvedValue(mockExpense);

      const result = await service.create('envelope-123', createDto);

      expect(result).toEqual({ message: 'Gasto creado' });
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(expensesRepository.create).toHaveBeenCalledWith(
        { ...createDto, envelopeId: 'envelope-123' },
        entityManager,
      );
      expect(envelopesRepository.incrementSpent).toHaveBeenCalledWith(
        'envelope-123',
        10,
        entityManager,
      );
    });
  });

  describe('remove', () => {
    it('should remove an expense and decrement envelope spent', async () => {
      expensesRepository.findById.mockResolvedValue(mockExpense);

      const result = await service.remove(mockEnvelope, 'expense-123');

      expect(result).toEqual({ message: 'Gasto eliminado' });
      expect(envelopesRepository.decrementSpent).toHaveBeenCalledWith(
        mockEnvelope.id,
        mockExpense.amount,
        entityManager,
      );
    });

    it('should throw NotFoundException if expense does not exist', async () => {
      expensesRepository.findById.mockResolvedValue(null);

      await expect(
        service.remove(mockEnvelope, 'non-existent'),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
    });
  });

  describe('findAll', () => {
    it('should return mapped expense responses', async () => {
      expensesRepository.findAll.mockResolvedValue([mockExpense]);

      const result = await service.findAll('envelope-123', {});

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockExpense.id);
      expect(expensesRepository.findAll).toHaveBeenCalledWith(
        'envelope-123',
        {},
      );
    });
  });
});
