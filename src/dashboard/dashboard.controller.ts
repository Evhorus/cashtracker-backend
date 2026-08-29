import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { RecentExpensesQueryDto } from './dto/recent-expenses-query.dto';
import { CategoryBreakdownQueryDto } from './dto/category-breakdown-query.dto';
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
    @Query() { currency, year }: CategoryBreakdownQueryDto,
  ) {
    return this.dashboardService.getCategoryBreakdown(userId, currency, year);
  }

  @Get('recent-expenses')
  getRecentExpenses(
    @CurrentUser('id') userId: string,
    @Query() { limit }: RecentExpensesQueryDto,
  ) {
    return this.dashboardService.getRecentExpenses(userId, limit);
  }
}
