import { applyDecorators, UseGuards } from '@nestjs/common';
import { EnvelopeExistsGuard } from '../guard/envelope-exists.guard';

export function EnvelopeExists() {
  return applyDecorators(UseGuards(EnvelopeExistsGuard));
}
