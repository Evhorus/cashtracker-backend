import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Envelope } from '../entities/envelope.entity';

/**
 * Custom repository for Envelope entity
 * Encapsulates complex queries and data access logic
 */
@Injectable()
export class EnvelopesRepository {
  constructor(
    @InjectRepository(Envelope)
    private readonly repository: Repository<Envelope>,
  ) {}

  /**
   * Find all envelopes for a user without expenses (light query)
   * Optimized for list views
   */
  async findByUserIdLight(userId: string) {
    return this.repository.findAndCount({
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
    });
  }

  /**
   * Find all envelopes for a user with expenses (full query)
   * Optimized for detail views
   */
  async findByUserIdWithExpenses(userId: string) {
    return this.repository
      .createQueryBuilder('envelope')
      .leftJoinAndSelect('envelope.expenses', 'expense')
      .where('envelope.userId = :userId', { userId })
      .orderBy('envelope.createdAt', 'DESC')
      .getManyAndCount();
  }

  /**
   * Find one envelope by ID
   */
  async findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  /**
   * Find one envelope by ID with expenses
   */
  async findByIdWithExpenses(id: string) {
    return this.repository.findOne({
      where: { id },
      relations: { expenses: true },
    });
  }

  /**
   * Create a new envelope
   */
  async create(envelopeData: Partial<Envelope>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    const envelope = repo.create(envelopeData);
    return repo.save(envelope);
  }

  /**
   * Update an envelope
   */
  async update(
    id: string,
    envelopeData: Partial<Envelope>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.update(id, envelopeData);
  }

  /**
   * Remove an envelope
   */
  async remove(envelope: Envelope, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.remove(envelope);
  }

  /**
   * Increment spent amount
   */
  async incrementSpent(id: string, amount: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.increment({ id }, 'spent', amount);
  }

  /**
   * Decrement spent amount
   */
  async decrementSpent(id: string, amount: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Envelope) : this.repository;
    return repo.decrement({ id }, 'spent', amount);
  }
}
