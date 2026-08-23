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
          totalAvailable: 600_000,
        },
        {
          currency: 'USD',
          totalEnvelopes: 1,
          totalAssigned: 500,
          totalSpent: 100,
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
  });
});
