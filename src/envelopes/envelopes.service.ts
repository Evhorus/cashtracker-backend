import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { EnvelopeResponseDto } from './dto/envelope-response.dto';
import { EnvelopeWithExpensesResponseDto } from './dto/envelope-with-expenses-response.dto';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { CategoriesRepository } from '../categories/repositories/categories.repository';
import { type EnvelopeStatusFilter } from './utils/envelope-status';

@Injectable()
export class EnvelopesService {
  constructor(
    private readonly envelopesRepository: EnvelopesRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  /**
   * Envelopes reference categories by id now, so a well-formed uuid
   * belonging to another user has to be rejected here - the DTO can
   * validate the shape but not who is asking. `null` clears the
   * category and is always allowed; `undefined` means "leave it alone"
   * on an update and is passed through untouched.
   */
  private async assertCategoryIsUsable(
    userId: string,
    categoryId: string | null | undefined,
  ) {
    if (!categoryId) return;

    const category = await this.categoriesRepository.findVisibleForUserById(
      userId,
      categoryId,
    );

    if (!category) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY_NOT_FOUND);
    }
  }

  async create(userId: string, createEnvelopeDto: CreateEnvelopeDto) {
    await this.assertCategoryIsUsable(userId, createEnvelopeDto.categoryId);

    await this.envelopesRepository.create({
      ...createEnvelopeDto,
      spent: 0,
      userId,
    });

    return {
      message: 'Sobre creado',
    };
  }

  /**
   * Find all envelopes without expenses (light query for list view),
   * paginated (page is 1-indexed). `filters.search` optionally filters
   * by name/category; `filters.status` by derived spending status, in
   * SQL, so `total` reflects the filtered set.
   */
  async findAllLight(
    userId: string,
    page: number,
    limit: number,
    filters: { search?: string; status?: EnvelopeStatusFilter } = {},
  ) {
    const [envelopes, total] = await this.envelopesRepository.findByUserIdLight(
      userId,
      page,
      limit,
      filters,
    );

    return new PaginatedResponseDto(
      EnvelopeResponseDto.fromEntities(envelopes),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string) {
    const envelope = await this.envelopesRepository.findById(id);

    if (!envelope) {
      throw new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND);
    }

    return envelope;
  }

  async findOnePlain(id: string) {
    const envelope = await this.envelopesRepository.findByIdWithExpenses(id);

    if (!envelope) {
      throw new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND);
    }

    return EnvelopeWithExpensesResponseDto.fromEntity(envelope);
  }

  async update(id: string, updateEnvelopeDto: UpdateEnvelopeDto) {
    const envelope = await this.findOne(id);
    await this.assertCategoryIsUsable(
      envelope.userId,
      updateEnvelopeDto.categoryId,
    );
    await this.envelopesRepository.update(id, updateEnvelopeDto);
    return {
      message: 'Sobre actualizado',
    };
  }

  async remove(id: string) {
    const envelope = await this.findOne(id);
    return await this.envelopesRepository.remove(envelope);
  }
}
