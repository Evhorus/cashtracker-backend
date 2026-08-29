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
    it('should keep a single currency as one totals entry, matching the old flat shape', async () => {
      // Arrange
      repository.getSummaryAggregate.mockResolvedValue([
        {
          currency: 'COP',
          count: 3,
          totalAssigned: 1_000_000,
          totalSpent: 400_000,
          cappedSpent: 400_000,
        },
      ]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert
      expect(result.totalEnvelopes).toBe(3);
      expect(result.totals).toEqual([
        {
          currency: 'COP',
          totalEnvelopes: 3,
          totalAssigned: 1_000_000,
          totalSpent: 400_000,
          totalSpentCapped: 400_000,
          totalAvailable: 600_000,
        },
      ]);
    });

    it("should keep totalSpentCapped (not totalSpent) as what totalAvailable is actually derived from, so an unlimited envelope's spending never makes the two look inconsistent", async () => {
      // Arrange - one currency where an uncapped envelope's spending
      // makes totalSpent (400_000 + 150_000) bigger than totalAssigned
      // itself. If totalAvailable were derived from totalSpent instead
      // of totalSpentCapped, it would go negative even though the
      // capped envelope is nowhere near its limit.
      repository.getSummaryAggregate.mockResolvedValue([
        {
          currency: 'COP',
          count: 2,
          totalAssigned: 1_000_000,
          totalSpent: 550_000,
          cappedSpent: 400_000,
        },
      ]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert
      expect(result.totals).toEqual([
        {
          currency: 'COP',
          totalEnvelopes: 2,
          totalAssigned: 1_000_000,
          totalSpent: 550_000,
          totalSpentCapped: 400_000,
          totalAvailable: 600_000,
        },
      ]);
    });

    it('should never sum money across currencies - one totals entry per currency, each computed from only its own envelopes', async () => {
      // Arrange
      repository.getSummaryAggregate.mockResolvedValue([
        {
          currency: 'COP',
          count: 2,
          totalAssigned: 1_000_000,
          totalSpent: 400_000,
          cappedSpent: 400_000,
        },
        {
          currency: 'USD',
          count: 1,
          totalAssigned: 500,
          totalSpent: 100,
          cappedSpent: 100,
        },
      ]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert - totalEnvelopes is currency-agnostic (sums the counts),
      // but the money totals stay split, one entry per currency.
      expect(result.totalEnvelopes).toBe(3);
      expect(result.totals).toEqual([
        {
          currency: 'COP',
          totalEnvelopes: 2,
          totalAssigned: 1_000_000,
          totalSpent: 400_000,
          totalSpentCapped: 400_000,
          totalAvailable: 600_000,
        },
        {
          currency: 'USD',
          totalEnvelopes: 1,
          totalAssigned: 500,
          totalSpent: 100,
          totalSpentCapped: 100,
          totalAvailable: 400,
        },
      ]);
    });

    it('should return an empty totals array and zero totalEnvelopes when the user has no envelopes', async () => {
      // Arrange
      repository.getSummaryAggregate.mockResolvedValue([]);
      repository.getMonthlySpending.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert
      expect(result.totalEnvelopes).toBe(0);
      expect(result.totals).toEqual([]);
    });

    it('should scope the monthly chart to the primary (most-used) currency', async () => {
      // Arrange - USD listed first here on purpose: the aggregate is
      // already sorted by count DESC by the repository, so the service
      // shouldn't need to re-sort, just trust row 0.
      repository.getSummaryAggregate.mockResolvedValue([
        {
          currency: 'USD',
          count: 5,
          totalAssigned: 1000,
          totalSpent: 200,
          cappedSpent: 200,
        },
        {
          currency: 'COP',
          count: 1,
          totalAssigned: 100_000,
          totalSpent: 0,
          cappedSpent: 0,
        },
      ]);
      repository.getMonthlySpending.mockResolvedValue([
        { month: '2026-08', spent: 200, available: 800 },
      ]);
      repository.getAvailableYears.mockResolvedValue([2026]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert
      expect(repository.getMonthlySpending).toHaveBeenCalledWith(
        'user-123',
        undefined,
        12,
        'USD',
      );
      expect(result.chart).toEqual([
        { label: 'Ago', spent: 200, available: 800 },
      ]);
    });

    it('should skip the monthly spending query entirely when there are no envelopes', async () => {
      // Arrange
      repository.getSummaryAggregate.mockResolvedValue([]);
      repository.getAvailableYears.mockResolvedValue([]);

      // Act
      const result = await service.getSummary('user-123');

      // Assert
      expect(repository.getMonthlySpending).not.toHaveBeenCalled();
      expect(result.chart).toEqual([]);
    });
  });

  describe('getCategoryBreakdown', () => {
    it('passes currency and year straight through', async () => {
      repository.getCategoryBreakdown.mockResolvedValue([]);

      await service.getCategoryBreakdown('user-123', 'COP', 2026);

      expect(repository.getCategoryBreakdown).toHaveBeenCalledWith(
        'user-123',
        'COP',
        2026,
      );
    });

    it('leaves year undefined for an all-time breakdown', async () => {
      repository.getCategoryBreakdown.mockResolvedValue([]);

      await service.getCategoryBreakdown('user-123', 'USD');

      expect(repository.getCategoryBreakdown).toHaveBeenCalledWith(
        'user-123',
        'USD',
        undefined,
      );
    });

    it('returns the aggregated rows unchanged', async () => {
      // The service is a pass-through here on purpose - the grouping is
      // the database's job, and reshaping rows in between would be a
      // second place for the numbers to change.
      const rows = [
        { category: 'Hogar', spent: 1_525_500, envelopeCount: 4 },
        { category: null, spent: 12_012, envelopeCount: 1 },
      ];
      repository.getCategoryBreakdown.mockResolvedValue(rows);

      await expect(
        service.getCategoryBreakdown('user-123', 'COP'),
      ).resolves.toEqual(rows);
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
