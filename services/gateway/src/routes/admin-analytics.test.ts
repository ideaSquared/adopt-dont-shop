import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthV1, RescueV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import { registerAdminAnalyticsRoutes } from './admin-analytics.js';

// --- Fixtures -------------------------------------------------------

const USER_STATS_FIXTURE = {
  total: 120,
  verified: 90,
  newThisMonth: 12,
  byStatus: [
    { status: AuthV1.UserStatus.USER_STATUS_ACTIVE, count: 80 },
    { status: AuthV1.UserStatus.USER_STATUS_INACTIVE, count: 40 },
  ],
  byType: [
    { userType: AuthV1.UserRole.USER_ROLE_ADOPTER, count: 100 },
    { userType: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF, count: 18 },
    { userType: AuthV1.UserRole.USER_ROLE_ADMIN, count: 2 },
  ],
};

const PET_STATS_FIXTURE = {
  total: 50,
  available: 30,
  pending: 5,
  adopted: 15,
  foster: 0,
  medicalHold: 0,
  behavioralHold: 0,
  notAvailable: 0,
  deceased: 0,
  monthlyAdoptions: 6,
  averageDaysToAdoption: 11,
};

const APP_STATS_FIXTURE = {
  total: 40,
  draft: 2,
  submitted: 10,
  underReview: 6,
  homeVisitScheduled: 3,
  homeVisitCompleted: 1,
  approved: 12,
  rejected: 4,
  withdrawn: 1,
  adopted: 1,
};

const RESCUE_COUNTS_FIXTURE: RescueV1.CountRescuesResponse = {
  pending: 1,
  verified: 2,
  suspended: 0,
  inactive: 0,
  rejected: 0,
  total: 3,
};

// --- Mocks ----------------------------------------------------------

// The routes only ever touch ONE method per client. We stub that method
// and leave the rest absent; the route never reaches them, so a partial
// stub typed through the client interface keeps the tests honest about
// which RPCs the aggregation actually depends on.
const stubClient = <T>(methods: Partial<T>): T => methods as T;

function makeAuthClient(): { client: AuthClient; getUserStatisticsMock: ReturnType<typeof vi.fn> } {
  const getUserStatisticsMock = vi.fn();
  return {
    client: stubClient<AuthClient>({ getUserStatistics: getUserStatisticsMock }),
    getUserStatisticsMock,
  };
}

function makePetsClient(): { client: PetsClient; getStatsMock: ReturnType<typeof vi.fn> } {
  const getStatsMock = vi.fn();
  return { client: stubClient<PetsClient>({ getStats: getStatsMock }), getStatsMock };
}

function makeApplicationsClient(): {
  client: ApplicationsClient;
  getStatsMock: ReturnType<typeof vi.fn>;
} {
  const getStatsMock = vi.fn();
  return { client: stubClient<ApplicationsClient>({ getStats: getStatsMock }), getStatsMock };
}

function makeRescueClient(): {
  client: RescueClient;
  countRescuesMock: ReturnType<typeof vi.fn>;
} {
  const countRescuesMock = vi.fn();
  return {
    client: stubClient<RescueClient>({ countRescues: countRescuesMock }),
    countRescuesMock,
  };
}

type Clients = {
  auth: ReturnType<typeof makeAuthClient>;
  pets: ReturnType<typeof makePetsClient>;
  apps: ReturnType<typeof makeApplicationsClient>;
  rescue: ReturnType<typeof makeRescueClient>;
};

function makeClients(): Clients {
  return {
    auth: makeAuthClient(),
    pets: makePetsClient(),
    apps: makeApplicationsClient(),
    rescue: makeRescueClient(),
  };
}

function primeHappyPath(c: Clients): void {
  c.auth.getUserStatisticsMock.mockResolvedValue(USER_STATS_FIXTURE);
  c.pets.getStatsMock.mockResolvedValue(PET_STATS_FIXTURE);
  c.apps.getStatsMock.mockResolvedValue(APP_STATS_FIXTURE);
  // Single grouped count — exact verified / pending / total.
  c.rescue.countRescuesMock.mockResolvedValue(RESCUE_COUNTS_FIXTURE);
}

async function buildApp(c: Clients): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAdminAnalyticsRoutes(app, {
    authClient: c.auth.client,
    petsClient: c.pets.client,
    applicationsClient: c.apps.client,
    rescueClient: c.rescue.client,
  });
  return app;
}

const ADMIN_HEADERS = { 'x-user-id': 'usr-admin', 'x-user-roles': 'admin' };

// --- GET /api/v1/admin/metrics --------------------------------------

describe('GET /api/v1/admin/metrics', () => {
  let app: FastifyInstance;
  let c: Clients;

  beforeEach(async () => {
    c = makeClients();
    app = await buildApp(c);
  });
  afterEach(async () => {
    await app.close();
  });

  it('aggregates platform counts from the four domain services', async () => {
    primeHappyPath(c);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        users: {
          total: number;
          active: number;
          newThisMonth: number;
          byRole: Record<string, number>;
        };
        rescues: { total: number; verified: number; pending: number; newThisMonth: number };
        pets: { total: number; available: number; adopted: number; newThisMonth: number };
        applications: { total: number; pending: number; approved: number; newThisMonth: number };
      };
    };

    expect(body.success).toBe(true);

    // Users — total / active (ACTIVE status row) / newThisMonth / byRole.
    expect(body.data.users.total).toBe(120);
    expect(body.data.users.active).toBe(80);
    expect(body.data.users.newThisMonth).toBe(12);
    expect(body.data.users.byRole).toEqual({ adopter: 100, rescue_staff: 18, admin: 2 });

    // Rescues — exact grouped counts from CountRescues.
    expect(body.data.rescues.verified).toBe(2);
    expect(body.data.rescues.pending).toBe(1);
    expect(body.data.rescues.total).toBe(3);
    expect(body.data.rescues.newThisMonth).toBe(0);

    // Pets — direct from GetPetStats.
    expect(body.data.pets.total).toBe(50);
    expect(body.data.pets.available).toBe(30);
    expect(body.data.pets.adopted).toBe(15);
    expect(body.data.pets.newThisMonth).toBe(0);

    // Applications — submitted collapses to pending.
    expect(body.data.applications.total).toBe(40);
    expect(body.data.applications.pending).toBe(10);
    expect(body.data.applications.approved).toBe(12);
    expect(body.data.applications.newThisMonth).toBe(0);
  });

  it('counts rescues with a single grouped CountRescues call', async () => {
    primeHappyPath(c);

    await app.inject({ method: 'GET', url: '/api/v1/admin/metrics', headers: ADMIN_HEADERS });

    // One exact, uncapped grouped count — not per-status paginated list scans.
    expect(c.rescue.countRescuesMock).toHaveBeenCalledTimes(1);
  });

  it('maps an upstream PERMISSION_DENIED to a 403', async () => {
    c.auth.getUserStatisticsMock.mockRejectedValue({
      code: status.PERMISSION_DENIED,
      details: 'no scope',
    });
    c.pets.getStatsMock.mockResolvedValue(PET_STATS_FIXTURE);
    c.apps.getStatsMock.mockResolvedValue(APP_STATS_FIXTURE);
    c.rescue.countRescuesMock.mockResolvedValue(RESCUE_COUNTS_FIXTURE);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/metrics',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- GET /api/v1/admin/analytics/dashboard --------------------------

describe('GET /api/v1/admin/analytics/dashboard', () => {
  let app: FastifyInstance;
  let c: Clients;

  beforeEach(async () => {
    c = makeClients();
    app = await buildApp(c);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the documented dashboard-analytics shape', async () => {
    primeHappyPath(c);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/dashboard',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        users: {
          totalUsers: number;
          activeUsers: number;
          newUsers: number;
          userGrowthRate: number;
          avgSessionDuration: number;
          retentionRate: number;
          topUserActivities: unknown[];
        };
        adoptions: {
          totalAdoptions: number;
          adoptionRate: number;
          avgTimeToAdoption: number;
          popularPetTypes: unknown[];
          adoptionTrends: unknown[];
          rescuePerformance: unknown[];
        };
        applications: {
          statusMetrics: Record<string, number>;
          trends: unknown[];
          avgProcessingTime: number;
          totalApplications: number;
          approvalRate: number;
        };
        generatedAt: string;
      };
    };

    expect(body.success).toBe(true);

    // Users sub-object — real counts where available, zero defaults otherwise.
    expect(body.data.users.totalUsers).toBe(120);
    expect(body.data.users.activeUsers).toBe(80);
    expect(body.data.users.newUsers).toBe(12);
    expect(body.data.users.avgSessionDuration).toBe(0);
    expect(body.data.users.retentionRate).toBe(0);
    expect(body.data.users.topUserActivities).toEqual([]);

    // Adoptions — monthlyAdoptions is the real adoptions figure; rate is derived.
    expect(body.data.adoptions.totalAdoptions).toBe(6);
    expect(body.data.adoptions.adoptionRate).toBeCloseTo((15 / 50) * 100);
    expect(body.data.adoptions.popularPetTypes).toEqual([]);
    expect(body.data.adoptions.adoptionTrends).toEqual([]);
    expect(body.data.adoptions.rescuePerformance).toEqual([]);

    // Applications — statusMetrics derived from GetStats; approvalRate from approved/total.
    expect(body.data.applications.totalApplications).toBe(40);
    expect(body.data.applications.statusMetrics.pending).toBe(10);
    expect(body.data.applications.statusMetrics.approved).toBe(12);
    expect(body.data.applications.statusMetrics.rejected).toBe(4);
    expect(body.data.applications.approvalRate).toBeCloseTo((12 / 40) * 100);
    expect(body.data.applications.trends).toEqual([]);

    // Provenance stamp is an ISO timestamp.
    expect(() => new Date(body.data.generatedAt).toISOString()).not.toThrow();
  });

  it('passes startDate / endDate through without error', async () => {
    primeHappyPath(c);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/dashboard?startDate=2026-01-01T00:00:00.000Z&endDate=2026-06-01T00:00:00.000Z',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('maps an upstream UNAVAILABLE to a 503', async () => {
    c.auth.getUserStatisticsMock.mockResolvedValue(USER_STATS_FIXTURE);
    c.pets.getStatsMock.mockRejectedValue({ code: status.UNAVAILABLE, details: 'down' });
    c.apps.getStatsMock.mockResolvedValue(APP_STATS_FIXTURE);
    c.rescue.countRescuesMock.mockResolvedValue(RESCUE_COUNTS_FIXTURE);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/analytics/dashboard',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(503);
  });
});
