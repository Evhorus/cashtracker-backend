import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './repositories/expenses.repository';
import { EnvelopesRepository } from '../envelopes/repositories/envelopes.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { Envelope } from '../envelopes/entities/envelope.entity';
import { Expense } from './entities/expense.entity';
import { Currency } from 'src/common/enums/currency.enum';
import { PaymentMethodsRepository } from '../payment-methods/repositories/payment-methods.repository';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expensesRepository: jest.Mocked<ExpensesRepository>;
  let envelopesRepository: jest.Mocked<EnvelopesRepository>;
  let paymentMethodsRepository: jest.Mocked<PaymentMethodsRepository>;
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
      findByIdForUpdate: jest.fn(),
      recalculateSpent: jest.fn(),
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
        {
          provide: PaymentMethodsRepository,
          useValue: { findForUserById: jest.fn() },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expensesRepository = module.get(ExpensesRepository);
    envelopesRepository = module.get(EnvelopesRepository);
    paymentMethodsRepository = module.get(PaymentMethodsRepository);
    dataSource = module.get(DataSource);
    entityManager = mockEntityManager;
  });

  describe('create', () => {
    // Currency, not the string 'COP': CreateExpenseDto types it as the
    // enum, so an untyped literal would not typecheck.
    const createDto = {
      name: 'Milk',
      amount: 10,
      currency: Currency.COP,
      date: new Date(),
    };

    it('locks the envelope, creates the expense and recomputes spent', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);

      const result = await service.create('envelope-123', createDto);

      expect(result).toEqual({ message: 'Gasto creado' });
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(envelopesRepository.findByIdForUpdate).toHaveBeenCalledWith(
        'envelope-123',
        entityManager,
      );
      expect(expensesRepository.create).toHaveBeenCalledWith(
        { ...createDto, envelopeId: 'envelope-123' },
        entityManager,
      );
      expect(envelopesRepository.recalculateSpent).toHaveBeenCalledWith(
        'envelope-123',
        entityManager,
      );
    });

    it('rejects a currency other than the envelope one', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);

      await expect(
        service.create('envelope-123', {
          ...createDto,
          currency: Currency.USD,
        }),
      ).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.EXPENSE_CURRENCY_MISMATCH),
      );
      expect(expensesRepository.create).not.toHaveBeenCalled();
      expect(envelopesRepository.recalculateSpent).not.toHaveBeenCalled();
    });

    it("rejects a payment method that is not the envelope owner's", async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      paymentMethodsRepository.findForUserById.mockResolvedValue(null);

      await expect(
        service.create('envelope-123', {
          ...createDto,
          paymentMethodId: '5b8e2c4e-1f3a-4c7e-9d2b-8a6f0e1c2d3b',
        }),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.PAYMENT_METHOD_NOT_FOUND),
      );
      expect(paymentMethodsRepository.findForUserById).toHaveBeenCalledWith(
        mockEnvelope.userId,
        '5b8e2c4e-1f3a-4c7e-9d2b-8a6f0e1c2d3b',
      );
      expect(expensesRepository.create).not.toHaveBeenCalled();
    });

    it('does not look up a payment method when none is sent', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);

      await service.create('envelope-123', createDto);

      expect(paymentMethodsRepository.findForUserById).not.toHaveBeenCalled();
    });

    it('fails with 404 if the envelope disappeared before the lock', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(null);

      await expect(service.create('envelope-123', createDto)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND),
      );
      expect(expensesRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates inside the lock and recomputes spent', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue(mockExpense);

      const result = await service.update({
        envelope: mockEnvelope,
        expenseId: 'expense-123',
        updateExpenseDto: { amount: 15 },
      });

      expect(result).toEqual({ message: 'Gasto actualizado' });
      // Re-read with the transaction's manager, not the guard's stale copy.
      expect(expensesRepository.findById).toHaveBeenCalledWith(
        'expense-123',
        entityManager,
      );
      expect(expensesRepository.update).toHaveBeenCalledWith(
        'expense-123',
        { amount: 15 },
        entityManager,
      );
      expect(envelopesRepository.recalculateSpent).toHaveBeenCalledWith(
        mockEnvelope.id,
        entityManager,
      );
    });

    it('rejects moving the expense to another currency', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue(mockExpense);

      await expect(
        service.update({
          envelope: mockEnvelope,
          expenseId: 'expense-123',
          updateExpenseDto: { currency: Currency.USD },
        }),
      ).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.EXPENSE_CURRENCY_MISMATCH),
      );
      expect(expensesRepository.update).not.toHaveBeenCalled();
    });

    it('fails with 404 if a concurrent request already deleted it', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue(null);

      await expect(
        service.update({
          envelope: mockEnvelope,
          expenseId: 'expense-123',
          updateExpenseDto: { amount: 15 },
        }),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
      expect(expensesRepository.update).not.toHaveBeenCalled();
      expect(envelopesRepository.recalculateSpent).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes inside the lock and recomputes spent', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue(mockExpense);

      const result = await service.remove(mockEnvelope, 'expense-123');

      expect(result).toEqual({ message: 'Gasto eliminado' });
      expect(expensesRepository.delete).toHaveBeenCalledWith(
        'expense-123',
        entityManager,
      );
      expect(envelopesRepository.recalculateSpent).toHaveBeenCalledWith(
        mockEnvelope.id,
        entityManager,
      );
    });

    it('fails with 404 and changes nothing if the expense is already gone', async () => {
      // The second of two simultaneous deletes lands here.
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue(null);

      await expect(
        service.remove(mockEnvelope, 'non-existent'),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
      expect(expensesRepository.delete).not.toHaveBeenCalled();
      expect(envelopesRepository.recalculateSpent).not.toHaveBeenCalled();
    });

    it('treats an expense from another envelope as not found', async () => {
      envelopesRepository.findByIdForUpdate.mockResolvedValue(mockEnvelope);
      expensesRepository.findById.mockResolvedValue({
        ...mockExpense,
        envelopeId: 'another-envelope',
      });

      await expect(service.remove(mockEnvelope, 'expense-123')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND),
      );
      expect(expensesRepository.delete).not.toHaveBeenCalled();
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
