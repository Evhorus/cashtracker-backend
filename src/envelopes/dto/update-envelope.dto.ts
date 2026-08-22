import { PartialType } from '@nestjs/mapped-types';
import { CreateEnvelopeDto } from './create-envelope.dto';

export class UpdateEnvelopeDto extends PartialType(CreateEnvelopeDto) {}
