import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

/**
 * Custom repository for Category entity
 * Encapsulates complex queries and data access logic
 */
@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  /**
   * Find every category visible to a user: the global set (userId IS
   * NULL - the 9 predefined ones, shared read-only by everyone, seeded
   * once as data - see migration 1787942400000-make-category-userid-
   * nullable) plus whatever they've personally created. Globals first,
   * then the user's own oldest-first - stable order for the picker.
   */
  async findVisibleForUser(userId: string) {
    return this.repository
      .createQueryBuilder('category')
      .where('category.userId = :userId', { userId })
      .orWhere('category.userId IS NULL')
      .orderBy('category.isDefault', 'DESC')
      .addOrderBy('category.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Find one category by ID
   */
  async findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  /**
   * Find one category visible to a user (their own, or a global one) by
   * label, case-insensitive - used to reject duplicates before create, so
   * a user can't shadow a global category's name with a personal one.
   */
  /**
   * One category by id, but only if this user may use it - their own, or
   * a global one. Envelopes reference categories by id now, so this is
   * what stops a well-formed uuid belonging to someone else from being
   * attached to an envelope.
   */
  async findVisibleForUserById(userId: string, id: string) {
    return this.repository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .andWhere('(category.userId = :userId OR category.userId IS NULL)', {
        userId,
      })
      .getOne();
  }

  async findVisibleForUserByLabel(userId: string, label: string) {
    return this.repository
      .createQueryBuilder('category')
      .where('(category.userId = :userId OR category.userId IS NULL)', {
        userId,
      })
      .andWhere('LOWER(category.label) = LOWER(:label)', { label })
      .getOne();
  }

  /**
   * Create a new category
   */
  async create(categoryData: Partial<Category>, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Category) : this.repository;
    const category = repo.create(categoryData);
    return repo.save(category);
  }

  /**
   * Update a category
   */
  async update(
    id: string,
    categoryData: Partial<Category>,
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(Category) : this.repository;
    return repo.update(id, categoryData);
  }

  /**
   * Remove a category
   */
  async remove(category: Category, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Category) : this.repository;
    return repo.remove(category);
  }
}
