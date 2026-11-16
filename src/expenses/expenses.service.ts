import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Envelope } from 'src/envelopes/entities/envelope.entity';
import { EnvelopesRepository } from 'src/envelopes/repositories/envelopes.repository';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { DataSource, EntityManager } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ExpensesPaginatedResponseDto } from './dto/expenses-paginated-response.dto';
import { GetExpensesFilterDto } from './dto/get-expenses-filter.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesRepository } from './repositories/expenses.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly envelopesRepository: EnvelopesRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Locks the envelope for the rest of the transaction - see
   * EnvelopesRepository.findByIdForUpdate. The guard already checked
   * that it exists and belongs to the caller; this re-read is what makes
   * concurrent writes on the same envelope take turns.
   */
  private async lockEnvelope(envelopeId: string, manager: EntityManager) {
    const envelope = await this.envelopesRepository.findByIdForUpdate(
      envelopeId,
      manager,
    );

    if (!envelope) {
      throw new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND);
    }

    return envelope;
  }

  /**
   * An envelope's `spent` is a sum in its own currency, so every expense
   * in it must share that currency. The web form already locks the
   * field, but the API is the boundary that has to hold. `undefined`
   * (an update that doesn't touch the currency) is always fine.
   */
  private assertSameCurrency(envelope: Envelope, currency?: string) {
    if (currency !== undefined && currency !== envelope.currency) {
      throw new BadRequestException(ERROR_MESSAGES.EXPENSE_CURRENCY_MISMATCH);
    }
  }

  /**
   * Re-reads the expense inside the locked transaction. The guard's copy
   * was read before the lock, so a concurrent delete may already have
   * removed it - that request must see a 404, not act on a stale row.
   */
  private async findExpenseInEnvelope(
    envelopeId: string,
    expenseId: string,
    manager: EntityManager,
  ) {
    const expense = await this.expensesRepository.findById(expenseId, manager);

    if (!expense || expense.envelopeId !== envelopeId) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return expense;
  }

  async create(envelopeId: string, createExpenseDto: CreateExpenseDto) {
    return this.dataSource.transaction(async (manager) => {
      const envelope = await this.lockEnvelope(envelopeId, manager);
      this.assertSameCurrency(envelope, createExpenseDto.currency);

      await this.expensesRepository.create(
        { ...createExpenseDto, envelopeId },
        manager,
      );
      await this.envelopesRepository.recalculateSpent(envelopeId, manager);

      return { message: 'Gasto creado' };
    });
  }

  async findAll(envelopeId: string, filters: GetExpensesFilterDto) {
    const { page, limit, ...rest } = filters;
    const [[expenses, total], totalAmount] = await Promise.all([
      this.expensesRepository.findAll(envelopeId, rest, page, limit),
      this.expensesRepository.calculateFilteredTotal(envelopeId, rest),
    ]);

    return new ExpensesPaginatedResponseDto(
      expenses.map((expense) => ExpenseResponseDto.fromEntity(expense)),
      total,
      page,
      limit,
      totalAmount,
    );
  }

  async findOne(id: string) {
    const expense = await this.expensesRepository.findById(id);

    if (!expense) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return ExpenseResponseDto.fromEntity(expense);
  }

  /**
   * Internal method for guards - returns Entity
   */
  async findOneInternal(id: string) {
    const expense = await this.expensesRepository.findById(id);

    if (!expense) {
      throw new NotFoundException(ERROR_MESSAGES.EXPENSE_NOT_FOUND);
    }

    return expense;
  }

  async update({
    envelope,
    expenseId,
    updateExpenseDto,
  }: {
    envelope: Envelope;
    expenseId: string;
    updateExpenseDto: UpdateExpenseDto;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const lockedEnvelope = await this.lockEnvelope(envelope.id, manager);
      this.assertSameCurrency(lockedEnvelope, updateExpenseDto.currency);
      await this.findExpenseInEnvelope(envelope.id, expenseId, manager);

      await this.expensesRepository.update(
        expenseId,
        updateExpenseDto,
        manager,
      );
      await this.envelopesRepository.recalculateSpent(envelope.id, manager);

      return { message: 'Gasto actualizado' };
    });
  }

  async remove(envelope: Envelope, expenseId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockEnvelope(envelope.id, manager);
      await this.findExpenseInEnvelope(envelope.id, expenseId, manager);

      await this.expensesRepository.delete(expenseId, manager);
      await this.envelopesRepository.recalculateSpent(envelope.id, manager);

      return { message: 'Gasto eliminado' };
    });
  }
}
