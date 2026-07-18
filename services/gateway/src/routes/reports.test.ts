import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditV1, AuthV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { AuditClient } from '../grpc-clients/audit-client.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';

import { registerReportsRoutes } from './reports.js';

function makeClient(): {
  client: AuditClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = {
    listSavedReports: vi.fn(),
    getSavedReport: vi.fn(),
    createSavedReport: vi.fn(),
    updateSavedReport: vi.fn(),
    deleteSavedReport: vi.fn(),
    listReportTemplates: vi.fn(),
    upsertReportSchedule: vi.fn(),
    createReportShare: vi.fn(),
  };
  return { client: mocks as unknown as AuditClient, mocks };
}

function makePetsClient(): {
  petsClient: PetsClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = {
    getAdoptionTrend: vi.fn(),
    getAdoptionsByType: vi.fn(),
    getTopRescuesByAdoptions: vi.fn(),
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

function makeAuthClient(): {
  authClient: AuthClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = { getUserStatistics: vi.fn() };
  return { authClient: mocks as unknown as AuthClient, mocks };
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'reports.read,reports.create,reports.update,reports.delete',
};

const RESCUE_HEADERS = {
  'x-user-id': 'usr-rescue-staff',
  'x-user-roles': 'rescue_staff',
  'x-user-permissions': 'reports.read,reports.create',
  'x-rescue-id': 'rescue-1',
};

const REPORT_FIXTURE = {
  savedReportId: 'rep-1',
  userId: 'usr-1',
  rescueId: undefined,
  templateId: undefined,
  name: 'My Report',
  description: undefined,
  configJson: '{"widgets":[]}',
  isArchived: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const TEMPLATE_FIXTURE = {
  templateId: 't-1',
  name: 'Adoption summary',
  description: undefined,
  category: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION,
  configJson: '{"widgets":[]}',
  isSystem: true,
  rescueId: undefined,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('/api/v1/reports gateway routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];
  let petsMocks: ReturnType<typeof makePetsClient>['mocks'];
  let applicationsMocks: ReturnType<typeof makeApplicationsClient>['mocks'];
  let authMocks: ReturnType<typeof makeAuthClient>['mocks'];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, mocks: m } = makeClient();
    const { petsClient, mocks: pm } = makePetsClient();
    const { applicationsClient, mocks: am } = makeApplicationsClient();
    const { authClient, mocks: authm } = makeAuthClient();
    mocks = m;
    petsMocks = pm;
    applicationsMocks = am;
    authMocks = authm;
    await registerReportsRoutes(app, { client, petsClient, applicationsClient, authClient });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / returns the monolith pagination envelope with snake_case keys', async () => {
    mocks.listSavedReports.mockResolvedValue({
      reports: [REPORT_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports?limit=5',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: Array<Record<string, unknown>>;
      pagination: { total: number };
    };
    expect(body.success).toBe(true);
    expect(body.data[0].saved_report_id).toBe('rep-1');
    expect(body.data[0].config).toEqual({ widgets: [] });
    expect(body.pagination.total).toBe(1);
  });

  it('GET /templates is matched before /:id (static-before-dynamic)', async () => {
    mocks.listReportTemplates.mockResolvedValue({ templates: [TEMPLATE_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/templates?category=adoption',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.listReportTemplates).toHaveBeenCalled();
    expect(mocks.getSavedReport).not.toHaveBeenCalled();
    const grpcReq = mocks.listReportTemplates.mock.calls[0][0];
    expect(grpcReq.category).toBe(AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION);
  });

  it('GET /:id returns the single row + decoded config', async () => {
    mocks.getSavedReport.mockResolvedValue({
      report: { ...REPORT_FIXTURE, configJson: '{"metrics":["adoptions_total"]}' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/rep-1',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { config: { metrics: string[] } } };
    expect(body.data.config).toEqual({ metrics: ['adoptions_total'] });
  });

  it('POST / encodes a `config` object body into configJson', async () => {
    mocks.createSavedReport.mockResolvedValue({ report: REPORT_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: ADMIN_HEADERS,
      payload: {
        name: 'My Report',
        config: { widgets: [{ id: 'w1' }] },
      },
    });
    expect(res.statusCode).toBe(201);
    const grpcReq = mocks.createSavedReport.mock.calls[0][0];
    expect(grpcReq.configJson).toBe('{"widgets":[{"id":"w1"}]}');
  });

  it('POST / maps gRPC INVALID_ARGUMENT → 400', async () => {
    mocks.createSavedReport.mockRejectedValue({
      code: grpcStatus.INVALID_ARGUMENT,
      details: 'config_json must be valid JSON',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: ADMIN_HEADERS,
      payload: { name: 'X', config_json: 'not json' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PUT /:id passes only set fields through', async () => {
    mocks.updateSavedReport.mockResolvedValue({ report: REPORT_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/reports/rep-1',
      headers: ADMIN_HEADERS,
      payload: { name: 'Renamed' },
    });
    const grpcReq = mocks.updateSavedReport.mock.calls[0][0];
    expect(grpcReq.name).toBe('Renamed');
    expect(grpcReq.description).toBeUndefined();
    expect(grpcReq.configJson).toBeUndefined();
    expect(grpcReq.isArchived).toBeUndefined();
  });

  it('DELETE /:id returns 404 when not deleted', async () => {
    mocks.deleteSavedReport.mockResolvedValue({ deleted: false });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/reports/rep-x',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC PERMISSION_DENIED → 403', async () => {
    mocks.listSavedReports.mockRejectedValue({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'no',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(403);
  });

  it('templates view stringifies the category back to the SPA-expected string', async () => {
    mocks.listReportTemplates.mockResolvedValue({ templates: [TEMPLATE_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/templates',
      headers: ADMIN_HEADERS,
    });
    const body = res.json() as { data: Array<Record<string, unknown>> };
    expect(body.data[0].category).toBe('adoption');
  });

  // ── execute (preview) ──────────────────────────────────────────────

  it('POST /execute computes a line widget via pets.getAdoptionTrend', async () => {
    petsMocks.getAdoptionTrend.mockResolvedValue({
      points: [{ date: '2026-01-01', count: 3 }],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: { groupBy: 'month' },
          widgets: [
            {
              id: 'w1',
              metric: 'adoption',
              chartType: 'line',
              options: { xKey: 'date', series: [{ key: 'count', label: 'Adoptions' }] },
            },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { widgets: Array<{ data: unknown[] }> } };
    expect(body.data.widgets[0].data).toEqual([{ date: '2026-01-01', count: 3 }]);
    expect(petsMocks.getAdoptionTrend.mock.calls[0][0].groupBy).toBe('month');
  });

  it('POST /execute falls back to default keys when options request dangerous property names', async () => {
    petsMocks.getAdoptionTrend.mockResolvedValue({
      points: [{ date: '2026-01-01', count: 3 }],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [
            {
              id: 'w1',
              metric: 'adoption',
              chartType: 'line',
              options: { xKey: '__proto__', series: [{ key: 'constructor', label: 'x' }] },
            },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: { widgets: Array<{ data: Array<Record<string, unknown>> }> };
    };
    const row = body.data.widgets[0].data[0];
    expect(row).toEqual({ date: '2026-01-01', count: 3 });
    expect(Object.prototype.hasOwnProperty.call(row, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(row, 'constructor')).toBe(false);
  });

  it('POST /execute computes a bar widget via applications.getStats', async () => {
    applicationsMocks.getStats.mockResolvedValue({
      total: 9,
      draft: 1,
      submitted: 2,
      underReview: 1,
      homeVisitScheduled: 0,
      homeVisitCompleted: 0,
      approved: 3,
      rejected: 1,
      withdrawn: 1,
      adopted: 0,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [
            {
              id: 'w2',
              metric: 'application',
              chartType: 'bar',
              options: { xKey: 'status', series: [{ key: 'count', label: 'Count' }] },
            },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { widgets: Array<{ data: unknown[] }> } };
    expect(body.data.widgets[0].data).toEqual(
      expect.arrayContaining([
        { status: 'submitted', count: 2 },
        { status: 'approved', count: 3 },
      ])
    );
  });

  it('POST /execute returns the platform-wide count for a platform-admin principal', async () => {
    authMocks.getUserStatistics.mockResolvedValue({
      total: 10,
      verified: 8,
      newThisMonth: 1,
      byStatus: [{ status: AuthV1.UserStatus.USER_STATUS_ACTIVE, count: 7 }],
      byType: [],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [
            { id: 'w1', metric: 'user', chartType: 'metric-card', options: { valueKey: 'active' } },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { widgets: Array<{ data: unknown[] }> } };
    expect(body.data.widgets[0].data).toEqual([{ active: 7 }]);
    expect(authMocks.getUserStatistics).toHaveBeenCalled();
  });

  it('POST /execute drops the user-metric widget for a rescue-scoped principal instead of leaking platform counts', async () => {
    authMocks.getUserStatistics.mockResolvedValue({
      total: 10,
      verified: 8,
      newThisMonth: 1,
      byStatus: [{ status: AuthV1.UserStatus.USER_STATUS_ACTIVE, count: 7 }],
      byType: [],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: RESCUE_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [
            { id: 'w1', metric: 'user', chartType: 'metric-card', options: { valueKey: 'active' } },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { widgets: Array<{ data: unknown[]; status: string }> } };
    expect(body.data.widgets[0].data).toEqual([]);
    expect(body.data.widgets[0].status).toBe('ok');
    expect(authMocks.getUserStatistics).not.toHaveBeenCalled();
  });

  it('POST /execute returns 400 when config is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /execute returns 200 with per-widget status when one widget RPC fails', async () => {
    petsMocks.getAdoptionTrend.mockResolvedValue({
      points: [{ date: '2026-01-01', count: 5 }],
    });
    applicationsMocks.getStats.mockRejectedValue(new Error('service unavailable'));
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [
            { id: 'w-ok', metric: 'adoption', chartType: 'line', options: {} },
            { id: 'w-fail', metric: 'application', chartType: 'bar', options: {} },
          ],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: {
        widgets: Array<{ id: string; status: string; data: unknown[]; error?: string }>;
      };
    };
    const [ok, failed] = body.data.widgets;
    expect(ok.id).toBe('w-ok');
    expect(ok.status).toBe('ok');
    expect(ok.data).toEqual([{ date: '2026-01-01', count: 5 }]);
    expect(failed.id).toBe('w-fail');
    expect(failed.status).toBe('error');
    // ADS-977: the client only ever sees a fixed, caller-safe string — the
    // raw downstream error message stays server-side (in the log).
    expect(failed.error).toBe('Aggregation unavailable');
    expect(failed.data).toEqual([]);
  });

  it('POST /execute never leaks a raw downstream error message to the client', async () => {
    petsMocks.getAdoptionTrend.mockResolvedValue({
      points: [{ date: '2026-01-01', count: 5 }],
    });
    applicationsMocks.getStats.mockRejectedValue(
      new Error('13 INTERNAL: relation "public.users" does not exist')
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/execute',
      headers: ADMIN_HEADERS,
      payload: {
        config: {
          filters: {},
          widgets: [{ id: 'w-fail', metric: 'application', chartType: 'bar', options: {} }],
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('relation');
    expect(res.body).not.toContain('public.users');
    const body = res.json() as { data: { widgets: Array<{ status: string; error?: string }> } };
    expect(body.data.widgets[0].status).toBe('error');
    expect(body.data.widgets[0].error).toBe('Aggregation unavailable');
  });

  // ── execute (saved) ──────────────────────────────────────────────────

  it('POST /:id/execute loads the saved config and computes widgets', async () => {
    mocks.getSavedReport.mockResolvedValue({
      report: {
        ...REPORT_FIXTURE,
        configJson: JSON.stringify({
          filters: {},
          widgets: [
            { id: 'w1', metric: 'user', chartType: 'metric-card', options: { valueKey: 'active' } },
          ],
        }),
      },
    });
    authMocks.getUserStatistics.mockResolvedValue({
      total: 10,
      verified: 8,
      newThisMonth: 1,
      byStatus: [{ status: AuthV1.UserStatus.USER_STATUS_ACTIVE, count: 7 }],
      byType: [],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/rep-1/execute',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { widgets: Array<{ data: unknown[] }> } };
    expect(body.data.widgets[0].data).toEqual([{ active: 7 }]);
  });

  it('POST /:id/execute returns 404 when the saved report does not exist', async () => {
    mocks.getSavedReport.mockResolvedValue({ report: undefined });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/rep-missing/execute',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });

  // ── schedule ──────────────────────────────────────────────────────────

  it('POST /:id/schedule upserts a schedule and returns the snake_case view', async () => {
    mocks.upsertReportSchedule.mockResolvedValue({
      schedule: {
        scheduleId: 'sched-1',
        savedReportId: 'rep-1',
        cron: '0 9 * * 1',
        timezone: 'UTC',
        format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
        recipients: [{ email: 'a@b.com' }],
        isEnabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/rep-1/schedule',
      headers: ADMIN_HEADERS,
      payload: { cron: '0 9 * * 1', recipients: [{ email: 'a@b.com' }], format: 'pdf' },
    });
    expect(res.statusCode).toBe(200);
    const grpcReq = mocks.upsertReportSchedule.mock.calls[0][0];
    expect(grpcReq.savedReportId).toBe('rep-1');
    expect(grpcReq.format).toBe(AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF);
    const body = res.json() as { data: Record<string, unknown> };
    expect(body.data.schedule_id).toBe('sched-1');
    expect(body.data.is_enabled).toBe(true);
    expect(body.data.format).toBe('pdf');
  });

  // ── share ─────────────────────────────────────────────────────────────

  it('POST /:id/share creates a token share', async () => {
    mocks.createReportShare.mockResolvedValue({
      share: {
        shareId: 'share-1',
        savedReportId: 'rep-1',
        shareType: 'token',
        permission: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW,
        createdAt: '2026-01-01T00:00:00Z',
      },
      token: 'plaintext-token',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/rep-1/share',
      headers: ADMIN_HEADERS,
      payload: { shareType: 'token', permission: 'view', expiresAt: '2026-12-31T00:00:00Z' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { data: { share: Record<string, unknown>; token: string } };
    expect(body.data.share.share_id).toBe('share-1');
    expect(body.data.token).toBe('plaintext-token');
  });

  it('POST /:id/share returns 501 for shareType=user (no backing RPC field)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/rep-1/share',
      headers: ADMIN_HEADERS,
      payload: { shareType: 'user', sharedWithUserId: 'usr-2' },
    });
    expect(res.statusCode).toBe(501);
    expect(mocks.createReportShare).not.toHaveBeenCalled();
  });
});
