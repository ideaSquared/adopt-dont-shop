import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';

import { registerAnalyticsMetricsRoutes } from './analytics-metrics.js';

function makePetsClient(): {
  petsClient: PetsClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = {
    getAdoptionTrend: vi.fn(),
    getStats: vi.fn(),
    getTopBreedsByAdoptions: vi.fn(),
  };
  return { petsClient: mocks as unknown as PetsClient, mocks };
}

function makeApplicationsClient(): {
  applicationsClient: ApplicationsClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = { getStats: vi.fn() };
  return { applicationsClient: mocks as unknown as ApplicationsClient, mocks };
}

// Mutually-exclusive per-status counts (each application has exactly one
// current status) that sum to `total`.
const APP_STATS_FIXTURE = {
  total: 156,
  draft: 5,
  submitted: 10,
  underReview: 15,
  homeVisitScheduled: 8,
  homeVisitCompleted: 6,
  approved: 4,
  rejected: 12,
  withdrawn: 2,
  adopted: 94,
};

describe('/api/v1/analytics gateway routes', () => {
  let app: FastifyInstance;
  let petsMocks: ReturnType<typeof makePetsClient>['mocks'];
  let applicationsMocks: ReturnType<typeof makeApplicationsClient>['mocks'];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { petsClient, mocks: pm } = makePetsClient();
    const { applicationsClient, mocks: am } = makeApplicationsClient();
    petsMocks = pm;
    applicationsMocks = am;
    await registerAnalyticsMetricsRoutes(app, { petsClient, applicationsClient });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/analytics/adoption-metrics', () => {
    it('returns 400 when startDate or endDate is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/adoption-metrics',
      });
      expect(res.statusCode).toBe(400);
    });

    it('composes totals, success rate and an auto previous-period comparison', async () => {
      petsMocks.getAdoptionTrend
        .mockResolvedValueOnce({
          points: [
            { date: '2026-01-08', count: 3 },
            { date: '2026-01-09', count: 5 },
          ],
        })
        .mockResolvedValueOnce({ points: [{ date: '2026-01-01', count: 4 }] });
      petsMocks.getStats.mockResolvedValue({ averageDaysToAdoption: 14 });
      applicationsMocks.getStats
        .mockResolvedValueOnce({ ...APP_STATS_FIXTURE, total: 100, adopted: 50 })
        .mockResolvedValueOnce({ ...APP_STATS_FIXTURE, total: 80, adopted: 20 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/adoption-metrics?startDate=2026-01-08T00:00:00.000Z&endDate=2026-01-15T00:00:00.000Z',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.totalAdoptions).toBe(8);
      expect(body.data.successRate).toBe(50);
      expect(body.data.averageTimeToAdoption).toBe(14);
      expect(body.data.adoptionTrends).toEqual([
        { date: '2026-01-08', count: 3 },
        { date: '2026-01-09', count: 5 },
      ]);
      expect(body.data.comparisonPeriod.totalAdoptions).toBe(4);
      expect(body.data.comparisonPeriod.successRate).toBe(25);
      expect(body.data.comparisonPeriod.percentageChange).toBe(100);

      // Previous period is the equal-length window immediately preceding startDate.
      const priorCall = petsMocks.getAdoptionTrend.mock.calls[1][0];
      expect(priorCall.startDate).toBe('2026-01-01T00:00:00.000Z');
      expect(priorCall.endDate).toBe('2026-01-08T00:00:00.000Z');
    });

    it('maps an upstream error to its HTTP status', async () => {
      petsMocks.getAdoptionTrend.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED });
      petsMocks.getStats.mockResolvedValue({ averageDaysToAdoption: 0 });
      applicationsMocks.getStats.mockResolvedValue(APP_STATS_FIXTURE);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/adoption-metrics?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-08T00:00:00.000Z',
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/application-analytics', () => {
    it('returns 400 when startDate or endDate is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/application-analytics',
      });
      expect(res.statusCode).toBe(400);
    });

    it('reshapes status counts into a forward-progression funnel', async () => {
      applicationsMocks.getStats.mockResolvedValue(APP_STATS_FIXTURE);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/application-analytics?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.totalApplications).toBe(156);
      // Cumulative forward-progression counts (submitted-or-later statuses):
      // Submitted=137, Under Review=127, Home Visit Scheduled=112,
      // Home Visit Completed=104, Approved=98, Adopted=94.
      expect(body.data.conversionRateByStage).toEqual([
        { stage: 'Submitted', conversionRate: 100, applicationsCount: 137 },
        {
          stage: 'Under Review',
          conversionRate: (127 / 137) * 100,
          applicationsCount: 127,
        },
        {
          stage: 'Home Visit Scheduled',
          conversionRate: (112 / 137) * 100,
          applicationsCount: 112,
        },
        {
          stage: 'Home Visit Completed',
          conversionRate: (104 / 137) * 100,
          applicationsCount: 104,
        },
        { stage: 'Approved', conversionRate: (98 / 137) * 100, applicationsCount: 98 },
        { stage: 'Adopted', conversionRate: (94 / 137) * 100, applicationsCount: 94 },
      ]);

      const call = applicationsMocks.getStats.mock.calls[0][0];
      expect(call.createdAfter).toBe('2026-01-01T00:00:00.000Z');
      expect(call.createdBefore).toBe('2026-01-31T00:00:00.000Z');
    });
  });

  describe('GET /api/v1/analytics/pet-performance', () => {
    it('returns 400 when startDate or endDate is missing', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/pet-performance' });
      expect(res.statusCode).toBe(400);
    });

    it('maps getTopBreedsByAdoptions onto mostPopularBreeds', async () => {
      petsMocks.getTopBreedsByAdoptions.mockResolvedValue({
        breeds: [
          { breed: 'Labrador', count: 24, averageAdoptionDays: 13 },
          { breed: 'Siamese', count: 12, averageAdoptionDays: 14 },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/pet-performance?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.mostPopularBreeds).toEqual([
        { breed: 'Labrador', count: 24, averageAdoptionTime: 13 },
        { breed: 'Siamese', count: 12, averageAdoptionTime: 14 },
      ]);
      const call = petsMocks.getTopBreedsByAdoptions.mock.calls[0][0];
      expect(call.limit).toBe(5);
    });
  });

  describe('GET /api/v1/analytics/stage-distribution', () => {
    it('reshapes the current status snapshot into stage + percentage + color', async () => {
      applicationsMocks.getStats.mockResolvedValue(APP_STATS_FIXTURE);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/analytics/stage-distribution',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toEqual([
        {
          stage: 'Submitted',
          count: 10,
          percentage: (10 / 156) * 100,
          color: '#3B82F6',
        },
        {
          stage: 'Under Review',
          count: 15,
          percentage: (15 / 156) * 100,
          color: '#8B5CF6',
        },
        {
          stage: 'Home Visit Scheduled',
          count: 8,
          percentage: (8 / 156) * 100,
          color: '#10B981',
        },
        {
          stage: 'Home Visit Completed',
          count: 6,
          percentage: (6 / 156) * 100,
          color: '#F59E0B',
        },
        { stage: 'Approved', count: 4, percentage: (4 / 156) * 100, color: '#06B6D4' },
        { stage: 'Adopted', count: 94, percentage: (94 / 156) * 100, color: '#EF4444' },
      ]);
      expect(applicationsMocks.getStats.mock.calls[0][0]).toEqual({});
    });
  });
});
