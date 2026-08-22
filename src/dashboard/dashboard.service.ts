import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

const CHART_TOP_N = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(
    userId: string,
    year?: number,
  ): Promise<DashboardSummaryResponseDto> {
    const [aggregate, topEnvelopes, availableYears] = await Promise.all([
      this.dashboardRepository.getSummaryAggregate(userId, year),
      this.dashboardRepository.getTopSpentEnvelopes(userId, year, CHART_TOP_N),
      this.dashboardRepository.getAvailableYears(userId),
    ]);

    return {
      totalEnvelopes: aggregate.count,
      totalAssigned: aggregate.totalAssigned,
      totalSpent: aggregate.totalSpent,
      totalAvailable: aggregate.totalAssigned - aggregate.cappedSpent,
      chart: topEnvelopes.map((envelope) => {
        const spent = Number(envelope.spent);
        const amount =
          envelope.amount === null ? null : Number(envelope.amount);
        return {
          name: envelope.name,
          spent,
          available: amount === null ? 0 : Math.max(0, amount - spent),
        };
      }),
      availableYears,
    };
  }
}
