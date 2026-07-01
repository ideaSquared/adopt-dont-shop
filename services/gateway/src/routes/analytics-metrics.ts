// REST → gRPC composition for the rescue SPA's Analytics dashboard
// (apps/rescue/src/pages/Analytics.tsx via analyticsService.ts). There is
// no analytics microservice — every route fans out to existing
// aggregation RPCs on service.pets / service.applications and reshapes
// the result into the SPA's documented contract. Rescue-staff scoping is
// enforced server-side by each upstream handler from the principal
// (resolveRescueScope) — these routes never need to pass a rescue id
// themselves.
//
// Route map:
//   GET /api/v1/analytics/adoption-metrics      → pets.getAdoptionTrend (current +
//                                                  auto previous-equal-length period)
//                                                  + pets.getStats + applications.getStats
//   GET /api/v1/analytics/application-analytics → applications.getStats, reshaped into
//                                                  a forward-progression conversion funnel
//   GET /api/v1/analytics/pet-performance       → pets.getTopBreedsByAdoptions
//   GET /api/v1/analytics/stage-distribution    → applications.getStats, reshaped into
//                                                  current-snapshot per-stage counts
//
// Known gaps (no backing RPC exists, so these fields are dropped rather
// than half-built): per-species adoption rates/average-time, per-stage
// average duration + bottleneck detection, response-time/SLA/staff
// metrics, CSV/PDF export, email-report, custom-reports. None of these
// are read by Analytics.tsx today.

import type { FastifyInstance } from 'fastify';

import type { GetStatsResponse as ApplicationsGetStatsResponse } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type AnalyticsMetricsRoutesOptions = {
  petsClient: PetsClient;
  applicationsClient: ApplicationsClient;
};

const rate = (numerator: number, denominator: number): number =>
  denominator > 0 ? (numerator / denominator) * 100 : 0;

const sumCounts = (points: ReadonlyArray<{ count: number }>): number =>
  points.reduce((sum, p) => sum + p.count, 0);

function requireDateRange(
  query: Record<string, string | undefined>
): { startDate: string; endDate: string } | undefined {
  if (!query.startDate || !query.endDate) {
    return undefined;
  }
  return { startDate: query.startDate, endDate: query.endDate };
}

// The previous period immediately preceding [startDate, endDate), with
// the same duration — used as the adoption-metrics trend comparison when
// the caller doesn't supply an explicit comparisonStart/comparisonEnd.
function previousPeriod(startDate: string, endDate: string): { start: string; end: string } {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const durationMs = end - start;
  return { start: new Date(start - durationMs).toISOString(), end: startDate };
}

// Forward-progression cumulative funnel: an application currently sitting
// in a later stage necessarily passed through every earlier one (the
// status machine is forward-only). Applications currently rejected/
// withdrawn exited at an unknown earlier stage and are excluded — there's
// no RPC tracking which stage a dropped application reached.
const FUNNEL_STAGES: ReadonlyArray<{
  stage: string;
  fields: ReadonlyArray<keyof ApplicationsGetStatsResponse>;
}> = [
  {
    stage: 'Submitted',
    fields: [
      'submitted',
      'underReview',
      'homeVisitScheduled',
      'homeVisitCompleted',
      'approved',
      'adopted',
    ],
  },
  {
    stage: 'Under Review',
    fields: ['underReview', 'homeVisitScheduled', 'homeVisitCompleted', 'approved', 'adopted'],
  },
  {
    stage: 'Home Visit Scheduled',
    fields: ['homeVisitScheduled', 'homeVisitCompleted', 'approved', 'adopted'],
  },
  { stage: 'Home Visit Completed', fields: ['homeVisitCompleted', 'approved', 'adopted'] },
  { stage: 'Approved', fields: ['approved', 'adopted'] },
  { stage: 'Adopted', fields: ['adopted'] },
];

const STAGE_DISTRIBUTION_STAGES: ReadonlyArray<{
  stage: string;
  field: keyof ApplicationsGetStatsResponse;
  color: string;
}> = [
  { stage: 'Submitted', field: 'submitted', color: '#3B82F6' },
  { stage: 'Under Review', field: 'underReview', color: '#8B5CF6' },
  { stage: 'Home Visit Scheduled', field: 'homeVisitScheduled', color: '#10B981' },
  { stage: 'Home Visit Completed', field: 'homeVisitCompleted', color: '#F59E0B' },
  { stage: 'Approved', field: 'approved', color: '#06B6D4' },
  { stage: 'Adopted', field: 'adopted', color: '#EF4444' },
];

export const registerAnalyticsMetricsRoutes = async (
  app: FastifyInstance,
  opts: AnalyticsMetricsRoutesOptions
): Promise<void> => {
  const { petsClient, applicationsClient } = opts;

  app.get(
    '/api/v1/analytics/adoption-metrics',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Adoption totals, success rate and trend for the rescue Analytics dashboard',
        querystring: {
          type: 'object',
          properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const range = requireDateRange(req.query as Record<string, string | undefined>);
      if (!range) {
        return reply
          .code(400)
          .send({ success: false, error: 'startDate and endDate are required' });
      }
      const { startDate, endDate } = range;
      const prior = previousPeriod(startDate, endDate);
      const metadata = buildMetadata(req);
      try {
        const [currentTrend, priorTrend, petStats, currentApps, priorApps] = await Promise.all([
          petsClient.getAdoptionTrend({ startDate, endDate }, metadata),
          petsClient.getAdoptionTrend({ startDate: prior.start, endDate: prior.end }, metadata),
          petsClient.getStats({}, metadata),
          applicationsClient.getStats(
            { createdAfter: startDate, createdBefore: endDate },
            metadata
          ),
          applicationsClient.getStats(
            { createdAfter: prior.start, createdBefore: prior.end },
            metadata
          ),
        ]);
        const totalAdoptions = sumCounts(currentTrend.points);
        const totalAdoptionsPrior = sumCounts(priorTrend.points);
        const percentageChange =
          totalAdoptionsPrior > 0
            ? ((totalAdoptions - totalAdoptionsPrior) / totalAdoptionsPrior) * 100
            : 0;
        return reply.send({
          success: true,
          data: {
            totalAdoptions,
            successRate: rate(currentApps.adopted, currentApps.total),
            averageTimeToAdoption: petStats.averageDaysToAdoption,
            adoptionTrends: currentTrend.points.map(p => ({ date: p.date, count: p.count })),
            comparisonPeriod: {
              totalAdoptions: totalAdoptionsPrior,
              successRate: rate(priorApps.adopted, priorApps.total),
              percentageChange,
            },
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/analytics/application-analytics',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Application funnel conversion rates for the rescue Analytics dashboard',
        querystring: {
          type: 'object',
          properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const range = requireDateRange(req.query as Record<string, string | undefined>);
      if (!range) {
        return reply
          .code(400)
          .send({ success: false, error: 'startDate and endDate are required' });
      }
      try {
        const res = await applicationsClient.getStats(
          { createdAfter: range.startDate, createdBefore: range.endDate },
          buildMetadata(req)
        );
        const submittedTotal = FUNNEL_STAGES[0].fields.reduce((sum, f) => sum + res[f], 0);
        return reply.send({
          success: true,
          data: {
            totalApplications: res.total,
            conversionRateByStage: FUNNEL_STAGES.map(({ stage, fields }) => {
              const applicationsCount = fields.reduce((sum, f) => sum + res[f], 0);
              return {
                stage,
                conversionRate: rate(applicationsCount, submittedTotal),
                applicationsCount,
              };
            }),
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/analytics/pet-performance',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Most popular breeds for the rescue Analytics dashboard',
        querystring: {
          type: 'object',
          properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const range = requireDateRange(req.query as Record<string, string | undefined>);
      if (!range) {
        return reply
          .code(400)
          .send({ success: false, error: 'startDate and endDate are required' });
      }
      try {
        const res = await petsClient.getTopBreedsByAdoptions(
          { startDate: range.startDate, endDate: range.endDate, limit: 5 },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          data: {
            mostPopularBreeds: res.breeds.map(b => ({
              breed: b.breed,
              count: b.count,
              averageAdoptionTime: b.averageAdoptionDays,
            })),
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/analytics/stage-distribution',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Current application status snapshot for the rescue Analytics dashboard',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await applicationsClient.getStats({}, buildMetadata(req));
        const data = STAGE_DISTRIBUTION_STAGES.map(({ stage, field, color }) => ({
          stage,
          count: res[field],
          percentage: rate(res[field], res.total),
          color,
        }));
        return reply.send({ success: true, data });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
