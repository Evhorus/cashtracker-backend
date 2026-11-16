import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';

import { ExpensesRepository } from './repositories/expenses.repository';
import { EnvelopesModule } from '../envelopes/envelopes.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesReportController } from './expenses-report.controller';
import { ExpensesReportService } from './expenses-report.service';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    EnvelopesModule, // Import EnvelopesModule to use its services/repositories
    PaymentMethodsModule,
  ],
  controllers: [ExpensesController, ExpensesReportController],
  providers: [ExpensesService, ExpensesReportService, ExpensesRepository],
  exports: [ExpensesService],
})
export class ExpensesModule {}
