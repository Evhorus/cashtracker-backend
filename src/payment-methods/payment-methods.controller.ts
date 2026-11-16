import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodExists } from './decorators/payment-method-exists.decorator';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAllForUser(userId);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.service.create(userId, dto);
  }

  @PaymentMethodExists()
  @Patch(':paymentMethodId')
  update(@Req() req: Request, @Body() dto: UpdatePaymentMethodDto) {
    if (!req.paymentMethod) throw new BadRequestException();
    return this.service.update(req.paymentMethod, dto);
  }

  @PaymentMethodExists()
  @Delete(':paymentMethodId')
  remove(@Req() req: Request) {
    if (!req.paymentMethod) throw new BadRequestException();
    return this.service.remove(req.paymentMethod);
  }
}
