import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';

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
  };
  return { client: mocks as unknown as AuditClient, mocks };
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'reports.read,reports.create,reports.update,reports.delete',
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

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, mocks: m } = makeClient();
    mocks = m;
    await registerReportsRoutes(app, { client });
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
});
