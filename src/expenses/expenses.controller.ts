import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { GetExpensesFilterDto } from './dto/get-expenses-filter.dto';
import type { Request } from 'express';
import { EnvelopeExists } from '../envelopes/decorators/envelope-exists.decorator';
import { ExpenseExists } from './decorators/expense-exists.decorator';
import { ExpensesService } from './expenses.service';

@Controller('envelopes/:envelopeId/expenses')
@EnvelopeExists() // All routes here require the envelope to exist and belong to the user
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    const envelopeId = req.envelope?.id;
    if (!envelopeId) {
      throw new BadRequestException('Envelope not found in request');
    }
    return this.expensesService.create(envelopeId, createExpenseDto);
  }

  @Get()
  findAllExpenses(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @Query() filters: GetExpensesFilterDto,
  ) {
    return this.expensesService.findAll(envelopeId, filters);
  }

  @ExpenseExists()
  @Get(':expenseId')
  findExpense(@Param('expenseId', ParseUUIDPipe) expenseId: string) {
    return this.expensesService.findOne(expenseId);
  }

  @ExpenseExists()
  @Patch(':expenseId')
  updateExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: Request,
  ) {
    const envelope = req.envelope;
    if (!envelope) {
      throw new BadRequestException('Envelope not found in request');
    }
    return this.expensesService.update({
      envelope,
      expenseId,
      updateExpenseDto,
    });
  }

  @ExpenseExists()
  @Delete(':expenseId')
  deleteExpense(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Req() req: Request,
  ) {
    const envelope = req.envelope;
    if (!envelope) {
      throw new BadRequestException('Envelope not found in request');
    }
    return this.expensesService.remove(envelope, expenseId);
  }
}
