import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './repositories/expenses.repository';
import { EnvelopesRepository } from '../envelopes/repositories/envelopes.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { Envelope } from '../envelopes/entities/envelope.entity';
import { Expense } from './entities/expense.entity';
import { Currency } from 'src/common/enums/currency.enum';

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
      calculateFilteredTotal: jest.fn(),
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
      // Currency, not the string 'COP': CreateExpenseDto types it as
      // the enum, so an untyped literal made this call not typecheck -
      // the one error keeping `tsc --noEmit` from passing on this repo.
      const createDto = {
        name: 'Milk',
        amount: 10,
        currency: Currency.COP,
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
    it('should return a paginated list of mapped expense responses', async () => {
      expensesRepository.findAll.mockResolvedValue([[mockExpense], 1]);
      expensesRepository.calculateFilteredTotal.mockResolvedValue(10);

      const result = await service.findAll('envelope-123', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id', mockExpense.id);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalAmount: 10,
      });
      expect(expensesRepository.findAll).toHaveBeenCalledWith(
        'envelope-123',
        {},
        1,
        20,
      );
      expect(expensesRepository.calculateFilteredTotal).toHaveBeenCalledWith(
        'envelope-123',
        {},
      );
    });

    it('should pass filters through without page/limit', async () => {
      expensesRepository.findAll.mockResolvedValue([[mockExpense], 1]);
      expensesRepository.calculateFilteredTotal.mockResolvedValue(10);

      await service.findAll('envelope-123', {
        page: 2,
        limit: 10,
        search: 'milk',
      });

      expect(expensesRepository.findAll).toHaveBeenCalledWith(
        'envelope-123',
        { search: 'milk' },
        2,
        10,
      );
      expect(expensesRepository.calculateFilteredTotal).toHaveBeenCalledWith(
        'envelope-123',
        { search: 'milk' },
      );
    });

    it('should sum only the filtered set, not just the current page', async () => {
      // The page in hand can be a partial slice of a filter that spans
      // multiple pages - totalAmount must come from the repository's own
      // full-set aggregate, not be derived from the mapped page here.
      expensesRepository.findAll.mockResolvedValue([[mockExpense], 50]);
      expensesRepository.calculateFilteredTotal.mockResolvedValue(123456.78);

      const result = await service.findAll('envelope-123', {
        page: 1,
        limit: 20,
      });

      expect(result.meta.totalAmount).toBe(123456.78);
    });
  });
});
