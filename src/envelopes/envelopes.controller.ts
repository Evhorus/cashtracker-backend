import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GetEnvelopesFilterDto } from './dto/get-envelopes-filter.dto';
import { EnvelopeExists } from './decorators/envelope-exists.decorator';
import { EnvelopesService } from './envelopes.service';

@Controller('envelopes')
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Post()
  createEnvelope(
    @Body() createEnvelopeDto: CreateEnvelopeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.envelopesService.create(userId, createEnvelopeDto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() { page, limit, search, status }: GetEnvelopesFilterDto,
  ) {
    return this.envelopesService.findAllLight(userId, page, limit, {
      search,
      status,
    });
  }

  @EnvelopeExists()
  @Get(':envelopeId')
  findEnvelope(@Param('envelopeId', ParseUUIDPipe) envelopeId: string) {
    return this.envelopesService.findOnePlain(envelopeId);
  }

  @EnvelopeExists()
  @Patch(':envelopeId')
  updateEnvelope(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @Body() updateEnvelopeDto: UpdateEnvelopeDto,
  ) {
    return this.envelopesService.update(envelopeId, updateEnvelopeDto);
  }

  @EnvelopeExists()
  @Delete(':envelopeId')
  remove(@Param('envelopeId', ParseUUIDPipe) envelopeId: string) {
    return this.envelopesService.remove(envelopeId);
  }
}
