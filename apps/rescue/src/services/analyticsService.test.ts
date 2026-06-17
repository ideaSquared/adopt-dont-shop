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
 * dashboard. On success it unwraps the API envelope; on failure it falls back
 * to deterministic mock data so the dashboard never crashes. Exports and
 * report management propagate errors so the UI can surface them.
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

    it('falls back to deterministic mock metrics on failure', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('down'));

      const result = await service.getAdoptionMetrics(dateRange);

      expect(result.successRate).toBe(78.5);
      expect(result.adoptionTrends.length).toBeGreaterThan(0);
      expect(result.totalAdoptions).toBe(
        result.adoptionTrends.reduce((sum, t) => sum + t.count, 0)
      );
    });
  });

  describe('other metric getters fall back to mock data on failure', () => {
    it('getApplicationAnalytics', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      const result = await service.getApplicationAnalytics(dateRange);
      expect(result.totalApplications).toBe(156);
      expect(result.bottlenecks.length).toBeGreaterThan(0);
    });

    it('getPetPerformance', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      const result = await service.getPetPerformance(dateRange);
      expect(result.mostPopularBreeds[0].breed).toBe('Labrador Retriever');
    });

    it('getResponseTimeMetrics', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      const result = await service.getResponseTimeMetrics(dateRange);
      expect(result.slaCompliance).toBe(87.3);
      expect(result.staffPerformance.length).toBe(4);
    });

    it('getStageDistribution', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      const result = await service.getStageDistribution();
      expect(result).toHaveLength(6);
      expect(result[0].stage).toBe('Submitted');
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

    it('saves a custom report and returns it', async () => {
      const report = { name: 'My Report', metrics: [], visualizations: [], filters: {} };
      apiServiceMock.post.mockResolvedValue({ success: true, data: { ...report, id: 'cr1' } });

      const result = await service.saveCustomReport(report);

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/analytics/custom-reports', report);
      expect(result.id).toBe('cr1');
    });

    it('propagates save failures', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('x'));
      await expect(
        service.saveCustomReport({ name: 'r', metrics: [], visualizations: [], filters: {} })
      ).rejects.toThrow('x');
    });

    it('lists custom reports', async () => {
      apiServiceMock.get.mockResolvedValue({ success: true, data: [{ name: 'r1' }] });

      const result = await service.getCustomReports();

      expect(result).toHaveLength(1);
    });

    it('returns an empty list when fetching custom reports fails', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));
      await expect(service.getCustomReports()).resolves.toEqual([]);
    });

    it('deletes a custom report', async () => {
      apiServiceMock.delete.mockResolvedValue(undefined);

      await service.deleteCustomReport('cr1');

      expect(apiServiceMock.delete).toHaveBeenCalledWith('/api/v1/analytics/custom-reports/cr1');
    });

    it('propagates delete failures', async () => {
      apiServiceMock.delete.mockRejectedValue(new Error('x'));
      await expect(service.deleteCustomReport('cr1')).rejects.toThrow('x');
    });
  });
});
