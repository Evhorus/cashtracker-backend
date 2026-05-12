import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BudgetsController } from './budgets.controller';
import { Budget } from './entities/budget.entity';
import { BudgetsRepository } from './repositories/budgets.repository';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget])],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetsRepository],
  exports: [BudgetsService, BudgetsRepository],
})
export class BudgetsModule {}
