import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Asserts that a value is a valid UUID string.
 * This is a TypeScript assertion function that narrows the type to 'string'.
 */
export function assertIsUUID(
  id: unknown,
  fieldName: string,
): asserts id is string {
  if (typeof id !== 'string' || !isUUID(id)) {
    throw new BadRequestException(`${fieldName} must be a valid UUID`);
  }
}
