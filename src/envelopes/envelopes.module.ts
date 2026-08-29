import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EnvelopesController } from './envelopes.controller';
import { Envelope } from './entities/envelope.entity';
import { EnvelopesRepository } from './repositories/envelopes.repository';
import { EnvelopesService } from './envelopes.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [TypeOrmModule.forFeature([Envelope]), CategoriesModule],
  controllers: [EnvelopesController],
  providers: [EnvelopesService, EnvelopesRepository],
  exports: [EnvelopesService, EnvelopesRepository],
})
export class EnvelopesModule {}
