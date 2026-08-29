import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { EnvelopeResponseDto } from './dto/envelope-response.dto';
import { EnvelopeWithExpensesResponseDto } from './dto/envelope-with-expenses-response.dto';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { type EnvelopeStatusFilter } from './utils/envelope-status';

@Injectable()
export class EnvelopesService {
  constructor(private readonly envelopesRepository: EnvelopesRepository) {}

  async create(userId: string, createEnvelopeDto: CreateEnvelopeDto) {
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
    await this.findOne(id);
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
