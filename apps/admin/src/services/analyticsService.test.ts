import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { analyticsService } from './analyticsService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('analyticsService', () => {
  describe('getPlatformMetrics', () => {
    it('fetches and unwraps the metrics envelope', async () => {
      const metrics = { users: { total: 10 } };
      mockGet.mockResolvedValueOnce({ success: true, data: metrics });

      const result = await analyticsService.getPlatformMetrics();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/metrics');
      expect(result).toEqual(metrics);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('serialises date options to ISO strings', async () => {
      const data = { generatedAt: '2024-01-01' };
      mockGet.mockResolvedValueOnce({ success: true, data });

      const start = new Date('2024-01-01T00:00:00.000Z');
      const end = new Date('2024-02-01T00:00:00.000Z');
      const result = await analyticsService.getDashboardAnalytics({
        startDate: start,
        endDate: end,
      });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/analytics/dashboard', {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-01T00:00:00.000Z',
      });
      expect(result).toEqual(data);
    });

    it('sends empty params when no options are given', async () => {
      mockGet.mockResolvedValueOnce({ success: true, data: { generatedAt: '2024-01-01' } });

      await analyticsService.getDashboardAnalytics();

      expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/analytics/dashboard', {});
    });
  });
});
