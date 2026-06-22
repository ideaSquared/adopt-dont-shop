// REST → gRPC aggregation for the admin SPA's Dashboard + Analytics pages.
//
// There is no analytics microservice. Both endpoints fan out to the
// stats/count RPCs on auth, pets, applications and rescue and compose the
// SPA's documented shapes at the gateway. Rescue counts come from
// rescue.CountRescues — a single grouped count, so verified/pending/total
// are exact and uncapped (the earlier rescue.List ×2 approach capped each
// status at the 100-row page limit). Fields with no feasible upstream
// source (time-series trends, session/retention metrics, per-rescue
// performance, "new this month" for entities whose stats RPC doesn't
// expose it) are zero/empty-defaulted rather than inventing new backend
// RPCs.
//
// Route map:
//   GET /api/v1/admin/metrics             → auth.GetUserStatistics +
//                                           pets.GetStats + apps.GetStats +
//                                           rescue.CountRescues
//   GET /api/v1/admin/analytics/dashboard → same fan-out, reshaped into the
//                                           larger DashboardAnalytics contract
//
// Admin-only surface (gated upstream by the SPA's route guard + each
// handler's own authz). The two routes register BEFORE the catch-all.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import {
  AuthV1,
  type GetUserStatisticsResponse,
  type GetPetStatsRequest,
  type GetPetStatsResponse,
  type GetStatsRequest as ApplicationsGetStatsRequest,
  type GetStatsResponse as ApplicationsGetStatsResponse,
  type CountRescuesResponse,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type AdminAnalyticsRoutesOptions = {
  authClient: AuthClient;
  petsClient: PetsClient;
  applicationsClient: ApplicationsClient;
  rescueClient: RescueClient;
};

// Per-route rate limits. Admin dashboards poll on an interval (the SPA
// refetches metrics every 60s), so these are sized for that cadence, not
// bulk scraping.
const ADMIN_ANALYTICS_RATE_LIMITS = {
  metrics: { max: 120, timeWindow: '1 minute' },
  dashboard: { max: 120, timeWindow: '1 minute' },
} as const;

// --- Response shapes (gateway-local; no lib.types dependency) --------

type PlatformMetrics = {
  users: { total: number; active: number; newThisMonth: number; byRole: Record<string, number> };
  rescues: { total: number; verified: number; pending: number; newThisMonth: number };
  pets: { total: number; available: number; adopted: number; newThisMonth: number };
  applications: { total: number; pending: number; approved: number; newThisMonth: number };
};

type DashboardAnalytics = {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: number;
    avgSessionDuration: number;
    retentionRate: number;
    topUserActivities: never[];
  };
  adoptions: {
    totalAdoptions: number;
    adoptionRate: number;
    avgTimeToAdoption: number;
    popularPetTypes: never[];
    adoptionTrends: never[];
    rescuePerformance: never[];
  };
  applications: {
    statusMetrics: Record<string, number>;
    trends: never[];
    avgProcessingTime: number;
    totalApplications: number;
    approvalRate: number;
  };
  generatedAt: string;
};

type SourceStats = {
  users: GetUserStatisticsResponse;
  pets: GetPetStatsResponse;
  applications: ApplicationsGetStatsResponse;
  rescues: CountRescuesResponse;
};

// --- Pure aggregation helpers ----------------------------------------

const rate = (numerator: number, denominator: number): number =>
  denominator > 0 ? (numerator / denominator) * 100 : 0;

// proto enum → SPA role label, e.g. USER_ROLE_RESCUE_STAFF → 'rescue_staff'.
const roleLabel = (role: AuthV1.UserRole): string =>
  AuthV1.userRoleToJSON(role)
    .replace(/^USER_ROLE_/, '')
    .toLowerCase();

const activeUserCount = (stats: GetUserStatisticsResponse): number =>
  stats.byStatus.find(s => s.status === AuthV1.UserStatus.USER_STATUS_ACTIVE)?.count ?? 0;

const usersByRole = (stats: GetUserStatisticsResponse): Record<string, number> =>
  Object.fromEntries(stats.byType.map(t => [roleLabel(t.userType), t.count]));

// The SPA's "Applications by Status" chart wants its own labels; collapse
// the raw service statuses into the lean set the chart renders.
const applicationStatusMetrics = (stats: ApplicationsGetStatsResponse): Record<string, number> => ({
  pending: stats.submitted,
  inReview: stats.underReview + stats.homeVisitScheduled + stats.homeVisitCompleted,
  approved: stats.approved,
  rejected: stats.rejected,
  withdrawn: stats.withdrawn,
});

const toPlatformMetrics = (s: SourceStats): PlatformMetrics => ({
  users: {
    total: s.users.total,
    active: activeUserCount(s.users),
    newThisMonth: s.users.newThisMonth,
    byRole: usersByRole(s.users),
  },
  rescues: {
    total: s.rescues.total,
    verified: s.rescues.verified,
    pending: s.rescues.pending,
    newThisMonth: 0,
  },
  pets: {
    total: s.pets.total,
    available: s.pets.available,
    adopted: s.pets.adopted,
    newThisMonth: 0,
  },
  applications: {
    total: s.applications.total,
    pending: s.applications.submitted,
    approved: s.applications.approved,
    newThisMonth: 0,
  },
});

const toDashboardAnalytics = (s: SourceStats): DashboardAnalytics => ({
  users: {
    totalUsers: s.users.total,
    activeUsers: activeUserCount(s.users),
    newUsers: s.users.newThisMonth,
    userGrowthRate: 0,
    avgSessionDuration: 0,
    retentionRate: 0,
    topUserActivities: [],
  },
  adoptions: {
    totalAdoptions: s.pets.monthlyAdoptions,
    adoptionRate: rate(s.pets.adopted, s.pets.total),
    avgTimeToAdoption: s.pets.averageDaysToAdoption,
    popularPetTypes: [],
    adoptionTrends: [],
    rescuePerformance: [],
  },
  applications: {
    statusMetrics: applicationStatusMetrics(s.applications),
    trends: [],
    avgProcessingTime: 0,
    totalApplications: s.applications.total,
    approvalRate: rate(s.applications.approved, s.applications.total),
  },
  generatedAt: new Date().toISOString(),
});

export const registerAdminAnalyticsRoutes = async (
  app: FastifyInstance,
  opts: AdminAnalyticsRoutesOptions
): Promise<void> => {
  const { authClient, petsClient, applicationsClient, rescueClient } = opts;

  await app.register(rateLimit, { global: false });

  // Fan out to every domain service concurrently. Shared by both routes
  // since they aggregate the same upstream counts into different shapes.
  const collectSourceStats = (metadata: ReturnType<typeof buildMetadata>): Promise<SourceStats> => {
    const petStatsReq: GetPetStatsRequest = {};
    const appStatsReq: ApplicationsGetStatsRequest = {};

    return Promise.all([
      authClient.getUserStatistics({}, metadata),
      petsClient.getStats(petStatsReq, metadata),
      applicationsClient.getStats(appStatsReq, metadata),
      rescueClient.countRescues({}, metadata),
    ]).then(([users, pets, applications, rescues]) => ({
      users,
      pets,
      applications,
      rescues,
    }));
  };

  // --- GET /api/v1/admin/metrics -----------------------------------
  app.get(
    '/api/v1/admin/metrics',
    {
      config: { rateLimit: ADMIN_ANALYTICS_RATE_LIMITS.metrics },
      schema: {
        tags: ['admin'],
        summary: 'Platform-wide metric counts for the admin dashboard',
      },
    },
    async (req, reply) => {
      try {
        const source = await collectSourceStats(buildMetadata(req));
        return reply.send({ success: true, data: toPlatformMetrics(source) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // --- GET /api/v1/admin/analytics/dashboard -----------------------
  app.get(
    '/api/v1/admin/analytics/dashboard',
    {
      config: { rateLimit: ADMIN_ANALYTICS_RATE_LIMITS.dashboard },
      schema: {
        tags: ['admin'],
        summary: 'Composed dashboard analytics for the admin Analytics page',
      },
    },
    async (req, reply) => {
      try {
        const source = await collectSourceStats(buildMetadata(req));
        return reply.send({ success: true, data: toDashboardAnalytics(source) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
