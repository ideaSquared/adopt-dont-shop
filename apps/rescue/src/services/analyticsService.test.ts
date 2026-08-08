import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  delete: vi.fn<(url: string) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { AnalyticsService } from './analyticsService';

/**
 * Behaviour tests for the analytics service that powers the rescue reporting
 * dashboard. On success it unwraps the API envelope; on failure every getter
 * propagates the error so the UI can surface it (no mock-data fallbacks).
 */
describe('AnalyticsService', () => {
  const service = new AnalyticsService();
  const dateRange = {
    start: new Date('2024-01-01T00:00:00Z'),
    end: new Date('2024-01-31T00:00:00Z'),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAdoptionMetrics', () => {
    it('requests the date range and returns the unwrapped data', async () => {
      const data = {
        totalAdoptions: 5,
        successRate: 90,
        averageTimeToAdoption: 7,
        adoptionTrends: [],
        comparisonPeriod: { totalAdoptions: 4, successRate: 80, percentageChange: 25 },
      };
      apiServiceMock.get.mockResolvedValue({ success: true, data });

      const result = await service.getAdoptionMetrics(dateRange);

      const [url] = apiServiceMock.get.mock.calls[0];
      expect(url).toContain('/api/v1/analytics/adoption-metrics');
      const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      expect(params.get('startDate')).toBe(dateRange.start.toISOString());
      expect(params.get('endDate')).toBe(dateRange.end.toISOString());
      expect(result).toBe(data);
    });

    it('appends comparison period params when provided', async () => {
      apiServiceMock.get.mockResolvedValue({ success: true, data: {} });
      const comparison = {
        start: new Date('2023-12-01T00:00:00Z'),
        end: new Date('2023-12-31T00:00:00Z'),
      };

      await service.getAdoptionMetrics(dateRange, comparison);

      const [url] = apiServiceMock.get.mock.calls[0];
      const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      expect(params.get('comparisonStart')).toBe(comparison.start.toISOString());
      expect(params.get('comparisonEnd')).toBe(comparison.end.toISOString());
    });

    it('propagates a failure instead of falling back to mock data', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('down'));
      await expect(service.getAdoptionMetrics(dateRange)).rejects.toThrow('down');
    });
  });

  describe('other metric getters propagate errors on failure', () => {
    it('getApplicationAnalytics', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      await expect(service.getApplicationAnalytics(dateRange)).rejects.toThrow('x');
    });

    it('getPetPerformance', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      await expect(service.getPetPerformance(dateRange)).rejects.toThrow('x');
    });

    it('getStageDistribution', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      await expect(service.getStageDistribution()).rejects.toThrow('x');
    });
  });

  describe('successful metric getters unwrap data', () => {
    it('getStageDistribution returns server data', async () => {
      const data = [{ stage: 'A', count: 1, percentage: 100, color: '#000' }];
      apiServiceMock.get.mockResolvedValue({ success: true, data });

      await expect(service.getStageDistribution()).resolves.toBe(data);
      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/analytics/stage-distribution');
    });
  });

  describe('exports', () => {
    it('posts a CSV export request and returns the blob', async () => {
      const blob = new Blob(['csv']);
      apiServiceMock.post.mockResolvedValue(blob);

      const result = await service.exportToCSV('adoptions', { petType: 'dog' });

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/analytics/export/csv', {
        reportType: 'adoptions',
        filters: { petType: 'dog' },
      });
      expect(result).toBe(blob);
    });

    it('propagates CSV export failures', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('boom'));
      await expect(service.exportToCSV('adoptions', {})).rejects.toThrow('boom');
    });

    it('posts a PDF export request', async () => {
      const blob = new Blob(['pdf']);
      apiServiceMock.post.mockResolvedValue(blob);

      await service.exportToPDF('adoptions', {});

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/analytics/export/pdf', {
        reportType: 'adoptions',
        filters: {},
      });
    });

    it('propagates PDF export failures', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('x'));
      await expect(service.exportToPDF('adoptions', {})).rejects.toThrow('x');
    });
  });

  describe('report management', () => {
    it('emails a report to recipients', async () => {
      apiServiceMock.post.mockResolvedValue(undefined);

      await service.emailReport('adoptions', {}, ['a@x.com']);

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/analytics/email-report', {
        reportType: 'adoptions',
        filters: {},
        recipients: ['a@x.com'],
      });
    });

    it('propagates email failures', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('x'));
      await expect(service.emailReport('r', {}, [])).rejects.toThrow('x');
    });
  });
});
