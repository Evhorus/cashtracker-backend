import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { RecentExpensesQueryDto } from './dto/recent-expenses-query.dto';
import { BreakdownQueryDto } from './dto/breakdown-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser('id') userId: string,
    @Query() { year, currency }: DashboardQueryDto,
  ) {
    return this.dashboardService.getSummary(userId, year, currency);
  }

  @Get('category-breakdown')
  getCategoryBreakdown(
    @CurrentUser('id') userId: string,
    @Query() { currency, year, startDate, endDate }: BreakdownQueryDto,
  ) {
    return this.dashboardService.getCategoryBreakdown(userId, currency, {
      year,
      startDate,
      endDate,
    });
  }

  @Get('envelope-breakdown')
  getEnvelopeBreakdown(
    @CurrentUser('id') userId: string,
    @Query() { currency, year, startDate, endDate }: BreakdownQueryDto,
  ) {
    return this.dashboardService.getEnvelopeBreakdown(userId, currency, {
      year,
      startDate,
      endDate,
    });
  }

  @Get('name-breakdown')
  getNameBreakdown(
    @CurrentUser('id') userId: string,
    @Query() { currency, year, startDate, endDate }: BreakdownQueryDto,
  ) {
    return this.dashboardService.getNameBreakdown(userId, currency, {
      year,
      startDate,
      endDate,
    });
  }

  @Get('breakdown-total')
  getBreakdownTotal(
    @CurrentUser('id') userId: string,
    @Query() { currency, year, startDate, endDate }: BreakdownQueryDto,
  ) {
    return this.dashboardService.getBreakdownTotal(userId, currency, {
      year,
      startDate,
      endDate,
    });
  }

  @Get('recent-expenses')
  getRecentExpenses(
    @CurrentUser('id') userId: string,
    @Query() { limit }: RecentExpensesQueryDto,
  ) {
    return this.dashboardService.getRecentExpenses(userId, limit);
  }
}
