import { Envelope } from '../entities/envelope.entity';
import { EnvelopeCategoryDto } from './envelope-category.dto';
import {
  deriveEnvelopeStatus,
  type EnvelopeProgressStatus,
} from '../utils/envelope-status';

/**
 * Response DTO for Envelope entity
 * Controls what data is exposed to the client
 */
export class EnvelopeResponseDto {
  id: string;
  name: string;
  amount: number | null;
  currency: string;
  spent: number;
  /**
   * Derived from `amount` and `spent`, not stored. Reported here so every
   * client renders the same status instead of each one reimplementing the
   * threshold - see utils/envelope-status.ts.
   */
  status: EnvelopeProgressStatus;
  /** The whole category, or null when unclassified - see
   * EnvelopeCategoryDto. */
  category: EnvelopeCategoryDto | null;
  description?: string;
  /** Date of its earliest and latest expense (`YYYY-MM-DD`), or null
   * without expenses - the period the envelope actually covers, which
   * its name or creation date may not say. */
  firstExpenseDate: string | null;
  lastExpenseDate: string | null;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Envelope entity to response DTO
   * @param envelope Envelope entity from database
   * @returns EnvelopeResponseDto for API response
   */
  static fromEntity(
    envelope: Envelope,
    expenseDates?: { first: string; last: string },
  ): EnvelopeResponseDto {
    return {
      id: envelope.id,
      name: envelope.name,
      amount: envelope.amount,
      currency: envelope.currency,
      spent: envelope.spent,
      status: deriveEnvelopeStatus(envelope.amount, envelope.spent),
      category: EnvelopeCategoryDto.fromEntity(envelope.category),
      description: envelope.description,
      firstExpenseDate: expenseDates?.first ?? null,
      lastExpenseDate: expenseDates?.last ?? null,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    };
  }
}
