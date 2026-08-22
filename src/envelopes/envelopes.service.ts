import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { EnvelopeResponseDto } from './dto/envelope-response.dto';
import { EnvelopeWithExpensesResponseDto } from './dto/envelope-with-expenses-response.dto';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';
import { EnvelopesRepository } from './repositories/envelopes.repository';

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
      message: 'Presupuesto creado',
    };
  }

  /**
   * Find all envelopes without expenses (light query for list view)
   * More efficient than findAll when expenses are not needed
   */
  async findAllLight(userId: string) {
    const [envelopes, count] =
      await this.envelopesRepository.findByUserIdLight(userId);

    return {
      count,
      data: EnvelopeResponseDto.fromEntities(envelopes),
    };
  }

  /**
   * Find all envelopes with expenses (full query for detail view)
   * Use this when you need expense data
   */
  async findAll(userId: string) {
    const [envelopes, count] =
      await this.envelopesRepository.findByUserIdWithExpenses(userId);

    return {
      count,
      data: envelopes.map((b) => EnvelopeWithExpensesResponseDto.fromEntity(b)),
    };
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
      message: 'Presupuesto Actualizado',
    };
  }

  async remove(id: string) {
    const envelope = await this.findOne(id);
    return await this.envelopesRepository.remove(envelope);
  }
}
