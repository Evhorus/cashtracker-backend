import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';

import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { BudgetExists } from './decorators/budget-exists.decorator';
import { BudgetsService } from './budgets.service';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  createBudget(
    @Body() createBudgetDto: CreateBudgetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.budgetsService.create(userId, createBudgetDto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.budgetsService.findAllLight(userId);
  }

  @BudgetExists()
  @Get(':budgetId')
  findBudget(@Param('budgetId', ParseUUIDPipe) budgetId: string) {
    return this.budgetsService.findOnePlain(budgetId);
  }

  @BudgetExists()
  @Patch(':budgetId')
  updateBudget(
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(budgetId, updateBudgetDto);
  }

  @BudgetExists()
  @Delete(':budgetId')
  remove(@Param('budgetId', ParseUUIDPipe) budgetId: string) {
    return this.budgetsService.remove(budgetId);
  }
}
