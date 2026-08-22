import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Request } from 'express';
import { EnvelopesService } from '../envelopes.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';

@Injectable()
export class EnvelopeExistsGuard implements CanActivate {
  constructor(private readonly envelopesService: EnvelopesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { envelopeId } = req.params;
    assertIsUUID(envelopeId, 'envelopeId');

    const envelope = await this.envelopesService.findOne(envelopeId);

    // Same response for "doesn't exist" and "exists but isn't yours" - an
    // envelope you don't own must be indistinguishable from one that isn't
    // there, otherwise a caller can enumerate other users' envelope IDs.
    if (!envelope || envelope.userId !== req.user?.id) {
      throw new NotFoundException(ERROR_MESSAGES.ENVELOPE_NOT_FOUND);
    }

    req.envelope = envelope;
    return true;
  }
}
