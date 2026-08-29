import { Envelope } from '../entities/envelope.entity';
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
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Transform Envelope entity to response DTO
   * @param envelope Envelope entity from database
   * @returns EnvelopeResponseDto for API response
   */
  static fromEntity(envelope: Envelope): EnvelopeResponseDto {
    return {
      id: envelope.id,
      name: envelope.name,
      amount: envelope.amount,
      currency: envelope.currency,
      spent: envelope.spent,
      status: deriveEnvelopeStatus(envelope.amount, envelope.spent),
      category: envelope.category,
      description: envelope.description,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
    };
  }

  /**
   * Transform array of Envelope entities to response DTOs
   * @param envelopes Array of Envelope entities
   * @returns Array of EnvelopeResponseDto
   */
  static fromEntities(envelopes: Envelope[]): EnvelopeResponseDto[] {
    return envelopes.map((envelope) => this.fromEntity(envelope));
  }
}
