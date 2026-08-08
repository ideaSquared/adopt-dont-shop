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
//   POST /api/v1/analytics/export/csv           → the four reads above, composed
//                                                  into one CSV download (no new
//                                                  data — a faithful serialisation
//                                                  of what the dashboard shows)
//
// Known gaps (no backing RPC exists, so these fields are dropped rather
// than half-built): per-species adoption rates/average-time, per-stage
// average duration + bottleneck detection, response-time/SLA/staff
// metrics, PDF export, email-report, custom-reports.

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

// Structural shapes of the upstream RPC responses this file reshapes — kept
// local so the pure shaping functions below stay decoupled from the generated
// proto client types (they only touch the fields used here).
type TrendResponse = { points: ReadonlyArray<{ date: string; count: number }> };
type PetStatsResponse = { averageDaysToAdoption: number };
type TopBreedsResponse = {
  breeds: ReadonlyArray<{ breed: string; count: number; averageAdoptionDays: number }>;
};

// The four pure reshapers. Each turns an upstream RPC response into the SPA's
// documented contract; the GET routes and the CSV export both compose them so
// there is exactly one source of truth for the shaping.
function shapeAdoptionMetrics(
  currentTrend: TrendResponse,
  priorTrend: TrendResponse,
  petStats: PetStatsResponse,
  currentApps: ApplicationsGetStatsResponse,
  priorApps: ApplicationsGetStatsResponse
) {
  const totalAdoptions = sumCounts(currentTrend.points);
  const totalAdoptionsPrior = sumCounts(priorTrend.points);
  const percentageChange =
    totalAdoptionsPrior > 0
      ? ((totalAdoptions - totalAdoptionsPrior) / totalAdoptionsPrior) * 100
      : 0;
  return {
    totalAdoptions,
    successRate: rate(currentApps.adopted, currentApps.total),
    averageTimeToAdoption: petStats.averageDaysToAdoption,
    adoptionTrends: currentTrend.points.map(p => ({ date: p.date, count: p.count })),
    comparisonPeriod: {
      totalAdoptions: totalAdoptionsPrior,
      successRate: rate(priorApps.adopted, priorApps.total),
      percentageChange,
    },
  };
}

function shapeApplicationAnalytics(res: ApplicationsGetStatsResponse) {
  const submittedTotal = FUNNEL_STAGES[0].fields.reduce((sum, f) => sum + res[f], 0);
  return {
    totalApplications: res.total,
    conversionRateByStage: FUNNEL_STAGES.map(({ stage, fields }) => {
      const applicationsCount = fields.reduce((sum, f) => sum + res[f], 0);
      return { stage, conversionRate: rate(applicationsCount, submittedTotal), applicationsCount };
    }),
  };
}

function shapePetPerformance(res: TopBreedsResponse) {
  return {
    mostPopularBreeds: res.breeds.map(b => ({
      breed: b.breed,
      count: b.count,
      averageAdoptionTime: b.averageAdoptionDays,
    })),
  };
}

function shapeStageDistribution(res: ApplicationsGetStatsResponse) {
  return STAGE_DISTRIBUTION_STAGES.map(({ stage, field, color }) => ({
    stage,
    count: res[field],
    percentage: rate(res[field], res.total),
    color,
  }));
}

// --- CSV serialisation (no dependency — a report is a handful of small
// sections). RFC-4180 quoting: wrap in quotes and double any embedded quote
// when a field contains a comma, quote or newline. Percentages are rounded to
// two places for a readable export; counts stay exact.
const round2 = (n: number): number => Math.round(n * 100) / 100;

const csvEscape = (value: string | number): string => {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csvRow = (fields: ReadonlyArray<string | number>): string => fields.map(csvEscape).join(',');

type AdoptionShape = ReturnType<typeof shapeAdoptionMetrics>;
type ApplicationShape = ReturnType<typeof shapeApplicationAnalytics>;
type PerformanceShape = ReturnType<typeof shapePetPerformance>;
type StageShape = ReturnType<typeof shapeStageDistribution>;

function renderAnalyticsCsv(
  range: { startDate: string; endDate: string },
  adoption: AdoptionShape,
  applications: ApplicationShape,
  performance: PerformanceShape,
  stages: StageShape
): string {
  const rows: string[] = [
    csvRow(["Adopt Don't Shop — Analytics Report"]),
    csvRow(['Period', range.startDate, range.endDate]),
    '',
    csvRow(['Adoption Metrics']),
    csvRow(['Total Adoptions', adoption.totalAdoptions]),
    csvRow(['Success Rate (%)', round2(adoption.successRate)]),
    csvRow(['Average Time to Adoption (days)', adoption.averageTimeToAdoption]),
    '',
    csvRow(['Adoption Trend']),
    csvRow(['Date', 'Adoptions']),
    ...adoption.adoptionTrends.map(p => csvRow([p.date, p.count])),
    '',
    csvRow(['Application Funnel']),
    csvRow(['Stage', 'Applications', 'Conversion Rate (%)']),
    ...applications.conversionRateByStage.map(s =>
      csvRow([s.stage, s.applicationsCount, round2(s.conversionRate)])
    ),
    '',
    csvRow(['Most Popular Breeds']),
    csvRow(['Breed', 'Adoptions', 'Average Adoption Time (days)']),
    ...performance.mostPopularBreeds.map(b => csvRow([b.breed, b.count, b.averageAdoptionTime])),
    '',
    csvRow(['Stage Distribution (current)']),
    csvRow(['Stage', 'Count', 'Percentage (%)']),
    ...stages.map(s => csvRow([s.stage, s.count, round2(s.percentage)])),
  ];
  return rows.join('\r\n') + '\r\n';
}

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
        return reply.send({
          success: true,
          data: shapeAdoptionMetrics(currentTrend, priorTrend, petStats, currentApps, priorApps),
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
        return reply.send({ success: true, data: shapeApplicationAnalytics(res) });
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
        return reply.send({ success: true, data: shapePetPerformance(res) });
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
        return reply.send({ success: true, data: shapeStageDistribution(res) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/analytics/export/csv — the dashboard's "Export CSV" button.
  // Composes the same four upstream reads (rescue-scoped server-side by the
  // principal, exactly as the GET routes) into a single CSV download. No 200
  // response schema is declared so Fastify sends the raw CSV string untouched.
  app.post(
    '/api/v1/analytics/export/csv',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Download the rescue Analytics dashboard as a CSV report',
        produces: ['text/csv'],
        body: {
          type: 'object',
          properties: {
            reportType: { type: 'string' },
            filters: {
              type: 'object',
              properties: {
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string' },
                    end: { type: 'string' },
                  },
                },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as {
        filters?: { dateRange?: { start?: string; end?: string } };
      };
      const start = body.filters?.dateRange?.start;
      const end = body.filters?.dateRange?.end;
      if (!start || !end) {
        return reply.code(400).send({
          success: false,
          error: 'filters.dateRange.start and filters.dateRange.end are required',
        });
      }
      const prior = previousPeriod(start, end);
      const metadata = buildMetadata(req);
      try {
        const [currentTrend, priorTrend, petStats, currentApps, priorApps, topBreeds, snapshot] =
          await Promise.all([
            petsClient.getAdoptionTrend({ startDate: start, endDate: end }, metadata),
            petsClient.getAdoptionTrend({ startDate: prior.start, endDate: prior.end }, metadata),
            petsClient.getStats({}, metadata),
            applicationsClient.getStats({ createdAfter: start, createdBefore: end }, metadata),
            applicationsClient.getStats(
              { createdAfter: prior.start, createdBefore: prior.end },
              metadata
            ),
            petsClient.getTopBreedsByAdoptions(
              { startDate: start, endDate: end, limit: 5 },
              metadata
            ),
            applicationsClient.getStats({}, metadata),
          ]);
        const csv = renderAnalyticsCsv(
          { startDate: start, endDate: end },
          shapeAdoptionMetrics(currentTrend, priorTrend, petStats, currentApps, priorApps),
          shapeApplicationAnalytics(currentApps),
          shapePetPerformance(topBreeds),
          shapeStageDistribution(snapshot)
        );
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header(
            'Content-Disposition',
            `attachment; filename="analytics-${start.slice(0, 10)}-to-${end.slice(0, 10)}.csv"`
          )
          .send(csv);
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
