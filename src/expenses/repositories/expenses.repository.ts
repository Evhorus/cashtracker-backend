import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';

@Injectable()
export class ExpensesRepository {
  constructor(
    @InjectRepository(Expense)
    private readonly repository: Repository<Expense>,
  ) {}

  async findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  async create(expenseData: Partial<Expense>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    const expense = repo.create(expenseData);
    return repo.save(expense);
  }

  async update(
    id: string,
    expenseData: Partial<Expense>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.update(id, expenseData);
  }

  async delete(id: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;
    return repo.delete({ id });
  }

  async calculateTotalSpent(envelopeId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Expense) : this.repository;

    const result = await repo
      .createQueryBuilder('expense')
      .where('expense.envelopeId = :envelopeId', { envelopeId })
      .select('SUM(expense.amount)', 'sum')
      .getRawOne<{ sum: string }>();

    return result && result.sum ? parseFloat(result.sum) : 0;
  }

  async findAll(
    envelopeId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      search?: string;
      categoryId?: string;
      sort?: 'ASC' | 'DESC';
    },
    page: number,
    limit: number,
  ) {
    const query = this.repository.createQueryBuilder('expense');

    query.where('expense.envelopeId = :envelopeId', { envelopeId });

    if (filters.startDate) {
      query.andWhere('expense.date >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('expense.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.search) {
      query.andWhere(
        '(LOWER(expense.name) LIKE LOWER(:search) OR LOWER(expense.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    const sortOrder = filters.sort || 'ASC';
    query.orderBy('expense.date', sortOrder);
    query.addOrderBy('expense.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    return query.getManyAndCount();
  }
}
