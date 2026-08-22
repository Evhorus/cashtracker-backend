import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { EnvelopesService } from '../envelopes.service';
import { assertIsUUID } from 'src/common/utils/validation.utils';

@Injectable()
export class EnvelopeExistsGuard implements CanActivate {
  constructor(private readonly envelopesService: EnvelopesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { envelopeId } = req.params;
    assertIsUUID(envelopeId, 'envelopeId');

    const envelope = await this.envelopesService.findOne(envelopeId);

    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }

    if (envelope.userId !== req.user?.id) {
      throw new UnauthorizedException('You do not own this envelope');
    }

    req.envelope = envelope;
    return true;
  }
}
