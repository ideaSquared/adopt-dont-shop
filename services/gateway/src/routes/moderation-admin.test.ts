import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import { registerModerationAdminRoutes } from './moderation-admin.js';

function makeClient(): {
  client: ModerationClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    'fileReport',
    'getReport',
    'listReports',
    'assignReport',
    'resolveReport',
    'logModeratorAction',
    'listModeratorActions',
    'addEvidence',
    'issueSanction',
    'listUserSanctions',
    'appealSanction',
    'openSupportTicket',
    'getSupportTicket',
    'listSupportTickets',
    'respondToTicket',
  ]) {
    mocks[m] = vi.fn();
  }
  const client = { ...mocks, close: vi.fn() } as unknown as ModerationClient;
  return { client, mocks };
}

async function makeApp(client: ModerationClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerModerationAdminRoutes(app, { client });
  return app;
}

const ADMIN = {
  'x-user-id': 'mod-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.dashboard',
};

const REPORT = {
  reportId: 'rpt-1',
  reporterId: 'usr-1',
  reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
  reportedEntityId: 'usr-2',
  category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  severity: ModerationV1.Severity.SEVERITY_HIGH,
  status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
  title: 'x',
  description: 'y',
  evidence: [],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
};

const TICKET = {
  ticketId: 'tkt-1',
  userEmail: 'a@b.c',
  status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
  priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
  category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_INQUIRY,
  subject: 'help',
  description: 'pls',
  tags: [],
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('moderation admin reports', () => {
  let app: FastifyInstance;
  let mocks: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const m = makeClient();
    mocks = m.mocks;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /admin/moderation/reports → list envelope with hasNext', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT], nextCursor: 'cur-2' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/reports?status=pending&limit=10',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: Array<{ status: string }>;
      pagination: { hasNext: boolean; nextCursor?: string };
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('pending');
    expect(body.pagination.hasNext).toBe(true);
    expect(body.pagination.nextCursor).toBe('cur-2');
    expect(mocks.listReports.mock.calls[0][0]).toMatchObject({
      status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
      limit: 10,
    });
  });

  it('GET /admin/moderation/reports/:id → { data } with lowercase enums', async () => {
    mocks.getReport.mockResolvedValueOnce({ report: REPORT, transitions: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/reports/rpt-1',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { reportId: string; category: string } };
    expect(body.data.reportId).toBe('rpt-1');
    expect(body.data.category).toBe('harassment');
  });

  it('PATCH /admin/moderation/reports/:id/status (resolved) → ResolveReport', async () => {
    mocks.resolveReport.mockResolvedValueOnce({ report: REPORT });
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/moderation/reports/rpt-1/status',
      headers: ADMIN,
      payload: { status: 'resolved', resolutionNotes: 'handled' },
    });
    expect(mocks.resolveReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      resolution: 'resolved',
      resolutionNotes: 'handled',
    });
  });

  it('PATCH /admin/moderation/reports/:id/status (dismissed) → ResolveReport with dismissed', async () => {
    mocks.resolveReport.mockResolvedValueOnce({ report: REPORT });
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/moderation/reports/rpt-1/status',
      headers: ADMIN,
      payload: { status: 'dismissed' },
    });
    expect(mocks.resolveReport.mock.calls[0][0].resolution).toBe('dismissed');
  });

  it('PATCH status with unsupported target → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/moderation/reports/rpt-1/status',
      headers: ADMIN,
      payload: { status: 'escalated' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /admin/moderation/reports/:id/assign threads moderatorId', async () => {
    mocks.assignReport.mockResolvedValueOnce({ report: REPORT });
    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/rpt-1/assign',
      headers: ADMIN,
      payload: { moderatorId: 'mod-2', reason: 'experienced' },
    });
    expect(mocks.assignReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      moderatorId: 'mod-2',
      reason: 'experienced',
    });
  });

  it('POST /admin/moderation/reports/bulk-update (resolve) calls ResolveReport per id', async () => {
    mocks.resolveReport.mockResolvedValue({ report: REPORT });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/bulk-update',
      headers: ADMIN,
      payload: { reportIds: ['rpt-1', 'rpt-2', 'rpt-3'], action: 'resolve' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.resolveReport).toHaveBeenCalledTimes(3);
    expect((res.json() as { updated: number }).updated).toBe(3);
  });

  it('bulk-update (assign) calls AssignReport with moderatorId per id', async () => {
    mocks.assignReport.mockResolvedValue({ report: REPORT });
    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/bulk-update',
      headers: ADMIN,
      payload: { reportIds: ['rpt-1'], action: 'assign', moderatorId: 'mod-2' },
    });
    expect(mocks.assignReport.mock.calls[0][0]).toMatchObject({ moderatorId: 'mod-2' });
  });

  it('bulk-update without ids → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/bulk-update',
      headers: ADMIN,
      payload: { action: 'resolve' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    mocks.listReports.mockRejectedValueOnce({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'nope',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/reports',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('moderation admin actions + tickets', () => {
  let app: FastifyInstance;
  let mocks: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const m = makeClient();
    mocks = m.mocks;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /admin/moderation/actions → list envelope', async () => {
    mocks.listModeratorActions.mockResolvedValueOnce({
      actions: [
        {
          actionId: 'act-1',
          moderatorId: 'mod-1',
          actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED,
          severity: ModerationV1.Severity.SEVERITY_LOW,
          reason: 'first',
          targetEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
          targetEntityId: 'usr-2',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/actions',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: Array<{ actionType: string }> }).data[0].actionType).toBe(
      'warning_issued'
    );
  });

  it('GET /admin/support/tickets → list envelope', async () => {
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/tickets?status=open',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: Array<{ status: string }>;
      pagination: { hasNext: boolean };
    };
    expect(body.data[0].status).toBe('open');
    expect(body.pagination.hasNext).toBe(false);
    expect(mocks.listSupportTickets.mock.calls[0][0]).toMatchObject({
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
    });
  });

  it('GET /admin/support/tickets/:id → { data, responses }', async () => {
    mocks.getSupportTicket.mockResolvedValueOnce({
      ticket: TICKET,
      responses: [
        {
          responseId: 'res-1',
          ticketId: 'tkt-1',
          responderId: 'mod-1',
          content: 'ack',
          isInternal: false,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/tickets/tkt-1',
      headers: ADMIN,
    });
    const body = res.json() as {
      data: { ticketId: string };
      responses: Array<{ responseId: string }>;
    };
    expect(body.data.ticketId).toBe('tkt-1');
    expect(body.responses[0].responseId).toBe('res-1');
  });

  it('POST /admin/support/tickets/:id/responses → 201 with view', async () => {
    mocks.respondToTicket.mockResolvedValueOnce({
      response: {
        responseId: 'res-1',
        ticketId: 'tkt-1',
        responderId: 'mod-1',
        content: 'hi',
        isInternal: false,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/support/tickets/tkt-1/responses',
      headers: ADMIN,
      payload: { content: 'hi', isInternal: false },
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as { data: { responseId: string } }).data.responseId).toBe('res-1');
  });
});
