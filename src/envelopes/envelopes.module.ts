import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnvelopesController } from './envelopes.controller';
import { Envelope } from './entities/envelope.entity';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { EnvelopesService } from './envelopes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Envelope])],
  controllers: [EnvelopesController],
  providers: [EnvelopesService, EnvelopesRepository],
  exports: [EnvelopesService, EnvelopesRepository],
})
export class EnvelopesModule {}
