import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';

describe('DashboardService', () => {
  let service: DashboardService;
  let repository: jest.Mocked<DashboardRepository>;

  beforeEach(async () => {
    const mockRepo = {
      getSummaryAggregate: jest.fn(),
      getMonthlySpending: jest.fn(),
      getAvailableYears: jest.fn(),
      getRecentExpenses: jest.fn(),
      getCategoryBreakdown: jest.fn(),
      getEnvelopeBreakdown: jest.fn(),
      getNameBreakdown: jest.fn(),
      getBreakdownTotal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: DashboardRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    repository = module.get(DashboardRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    /** One aggregate row as the repository returns it. */
    const row = (
      currency: string,
      count: number,
      over: Partial<{
        totalAssigned: number;
        totalSpent: number;
        cappedSpent: number;
        totalAvailable: number;
        totalExceeded: number;
      }> = {},
    ) => ({
      currency,
      count,
      totalAssigned: 0,
      totalSpent: 0,
      cappedSpent: 0,
      totalAvailable: 0,
      totalExceeded: 0,
      ...over,
    });

    it('passes the envelope totals through, available and exceeded kept apart', async () => {
      repository.getSummaryAggregate.mockResolvedValue([
        row('COP', 3, {
          totalAssigned: 1_000_000,
          totalSpent: 1_050_000,
          cappedSpent: 900_000,
          totalAvailable: 250_000,
          totalExceeded: 150_000,
        }),
      ]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      const result = await service.getSummary('user-123');

      expect(result.totalEnvelopes).toBe(3);
      expect(result.totals).toEqual([
        {
          currency: 'COP',
          totalEnvelopes: 3,
          totalAssigned: 1_000_000,
          totalSpent: 1_050_000,
          totalSpentCapped: 900_000,
          totalAvailable: 250_000,
          totalExceeded: 150_000,
        },
      ]);
    });

    it('never date-filters the envelope totals; year scopes only the chart', async () => {
      repository.getSummaryAggregate.mockResolvedValue([row('COP', 1)]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      await service.getSummary('user-123', 2025);

      expect(repository.getSummaryAggregate).toHaveBeenCalledWith('user-123');
      expect(repository.getMonthlySpending).toHaveBeenCalledWith(
        'user-123',
        2025,
        12,
        'COP',
      );
    });

    it('never sums money across currencies - one totals entry per currency', async () => {
      repository.getSummaryAggregate.mockResolvedValue([
        row('COP', 2, { totalAssigned: 1_000_000, totalAvailable: 600_000 }),
        row('USD', 1, { totalAssigned: 500, totalAvailable: 400 }),
      ]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      const result = await service.getSummary('user-123');

      expect(result.totalEnvelopes).toBe(3);
      expect(result.totals.map((t) => [t.currency, t.totalAvailable])).toEqual([
        ['COP', 600_000],
        ['USD', 400],
      ]);
    });

    it('returns empty totals and zero envelopes for a user with none', async () => {
      repository.getSummaryAggregate.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([]);

      const result = await service.getSummary('user-123');

      expect(result.totalEnvelopes).toBe(0);
      expect(result.totals).toEqual([]);
    });

    it('scopes the monthly chart to the primary (most-used) currency', async () => {
      // Already sorted by count DESC by the repository: trust row 0.
      repository.getSummaryAggregate.mockResolvedValue([
        row('USD', 5),
        row('COP', 1),
      ]);
      repository.getMonthlySpending.mockResolvedValue([
        { month: '2026-08', spent: 200 },
      ]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      const result = await service.getSummary('user-123');

      expect(repository.getMonthlySpending).toHaveBeenCalledWith(
        'user-123',
        undefined,
        12,
        'USD',
      );
      // The raw month key, untouched - the client formats it.
      expect(result.chart).toEqual([{ month: '2026-08', spent: 200 }]);
    });

    it('skips the monthly spending query when there are no envelopes', async () => {
      repository.getSummaryAggregate.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([]);

      const result = await service.getSummary('user-123');

      expect(repository.getMonthlySpending).not.toHaveBeenCalled();
      expect(result.chart).toEqual([]);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('passes currency and filters straight through', async () => {
      repository.getCategoryBreakdown.mockResolvedValue([]);

      await service.getCategoryBreakdown('user-123', 'COP', { year: 2026 });

      expect(repository.getCategoryBreakdown).toHaveBeenCalledWith(
        'user-123',
        'COP',
        { year: 2026 },
      );
    });

    it('passes an exact date range straight through', async () => {
      repository.getCategoryBreakdown.mockResolvedValue([]);

      await service.getCategoryBreakdown('user-123', 'COP', {
        startDate: '2026-01-01',
        endDate: '2026-08-31',
      });

      expect(repository.getCategoryBreakdown).toHaveBeenCalledWith(
        'user-123',
        'COP',
        { startDate: '2026-01-01', endDate: '2026-08-31' },
      );
    });

    it('defaults to an empty filter object for an all-time breakdown', async () => {
      repository.getCategoryBreakdown.mockResolvedValue([]);

      await service.getCategoryBreakdown('user-123', 'USD');

      expect(repository.getCategoryBreakdown).toHaveBeenCalledWith(
        'user-123',
        'USD',
        {},
      );
    });

    it('returns the aggregated rows unchanged', async () => {
      // The service is a pass-through here on purpose - the grouping is
      // the database's job, and reshaping rows in between would be a
      // second place for the numbers to change.
      const rows = [
        {
          category: {
            id: 'cat-1',
            label: 'Hogar',
            color: 'oklch(0.72 0.14 153)',
            icon: 'house',
          },
          spent: 1_525_500,
          expenseCount: 4,
        },
        // Expenses whose envelope has no category group into a single
        // null row.
        { category: null, spent: 12_012, expenseCount: 1 },
      ];
      repository.getCategoryBreakdown.mockResolvedValue(rows);

      await expect(
        service.getCategoryBreakdown('user-123', 'COP'),
      ).resolves.toEqual(rows);
    });
  });

  describe('getEnvelopeBreakdown', () => {
    it('passes currency and filters straight through', async () => {
      repository.getEnvelopeBreakdown.mockResolvedValue([]);

      await service.getEnvelopeBreakdown('user-123', 'COP', {
        startDate: '2026-01-01',
        endDate: '2026-08-31',
      });

      expect(repository.getEnvelopeBreakdown).toHaveBeenCalledWith(
        'user-123',
        'COP',
        { startDate: '2026-01-01', endDate: '2026-08-31' },
      );
    });

    it('returns the aggregated rows unchanged', async () => {
      const rows = [
        {
          envelopeId: 'env-1',
          envelopeName: 'Arriendos',
          spent: 8_000_000,
          expenseCount: 8,
          firstExpenseDate: '2026-01-05',
          lastExpenseDate: '2026-08-05',
        },
      ];
      repository.getEnvelopeBreakdown.mockResolvedValue(rows);

      await expect(
        service.getEnvelopeBreakdown('user-123', 'COP'),
      ).resolves.toEqual(rows);
    });
  });

  describe('getNameBreakdown', () => {
    it('passes currency and filters straight through', async () => {
      repository.getNameBreakdown.mockResolvedValue([]);

      await service.getNameBreakdown('user-123', 'COP', { year: 2026 });

      expect(repository.getNameBreakdown).toHaveBeenCalledWith(
        'user-123',
        'COP',
        { year: 2026 },
      );
    });

    it('returns the aggregated rows unchanged', async () => {
      const rows = [{ name: 'Arriendo', spent: 8_000_000, expenseCount: 8 }];
      repository.getNameBreakdown.mockResolvedValue(rows);

      await expect(
        service.getNameBreakdown('user-123', 'COP'),
      ).resolves.toEqual(rows);
    });
  });

  describe('getBreakdownTotal', () => {
    it('passes currency and filters straight through', async () => {
      repository.getBreakdownTotal.mockResolvedValue({
        spent: 0,
        expenseCount: 0,
      });

      await service.getBreakdownTotal('user-123', 'COP', {
        startDate: '2026-01-01',
        endDate: '2026-08-31',
      });

      expect(repository.getBreakdownTotal).toHaveBeenCalledWith(
        'user-123',
        'COP',
        { startDate: '2026-01-01', endDate: '2026-08-31' },
      );
    });

    it('returns the aggregated total unchanged', async () => {
      const total = { spent: 8_000_000, expenseCount: 8 };
      repository.getBreakdownTotal.mockResolvedValue(total);

      await expect(
        service.getBreakdownTotal('user-123', 'COP'),
      ).resolves.toEqual(total);
    });
  });

  describe('getRecentExpenses', () => {
    it('defaults to RECENT_EXPENSES_DEFAULT_LIMIT when no limit is given', async () => {
      repository.getRecentExpenses.mockResolvedValue([]);

      await service.getRecentExpenses('user-123');

      expect(repository.getRecentExpenses).toHaveBeenCalledWith('user-123', 5);
    });

    it('passes an explicit limit through to the repository', async () => {
      const expenses = [
        {
          id: 'exp-1',
          name: 'Supermercado Éxito',
          amount: 85_000,
          currency: 'COP',
          date: new Date('2026-08-12'),
          envelopeId: 'env-1',
          envelopeName: 'Mercado',
        },
      ];
      repository.getRecentExpenses.mockResolvedValue(expenses);

      const result = await service.getRecentExpenses('user-123', 3);

      expect(repository.getRecentExpenses).toHaveBeenCalledWith('user-123', 3);
      expect(result).toEqual(expenses);
    });
  });
});
