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
    'escalateReport',
    'logModeratorAction',
    'listModeratorActions',
    'getModerationMetrics',
    'addEvidence',
    'issueSanction',
    'listUserSanctions',
    'appealSanction',
    'openSupportTicket',
    'getSupportTicket',
    'listSupportTickets',
    'respondToTicket',
    'assignSupportTicket',
    'updateSupportTicket',
    'escalateSupportTicket',
    'getSupportTicketStats',
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

  it('POST /admin/moderation/reports/:id/escalate threads escalatedTo + reason', async () => {
    mocks.escalateReport.mockResolvedValueOnce({
      report: { ...REPORT, status: ModerationV1.ReportStatus.REPORT_STATUS_ESCALATED },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/rpt-1/escalate',
      headers: ADMIN,
      payload: { escalatedTo: 'mod-9', reason: 'needs senior review' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.escalateReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      escalatedTo: 'mod-9',
      reason: 'needs senior review',
    });
    expect((res.json() as { data: { status: string } }).data.status).toBe('escalated');
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

  it('bulk-update with too many ids → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/moderation/reports/bulk-update',
      headers: ADMIN,
      payload: {
        reportIds: Array.from({ length: 101 }, (_, i) => `rpt-${i}`),
        action: 'resolve',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringContaining('maximum') });
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

  it('GET /admin/moderation/metrics → { success, data } with lowercased category tokens', async () => {
    mocks.getModerationMetrics.mockResolvedValueOnce({
      totalReports: 10,
      pendingReports: 3,
      underReviewReports: 1,
      resolvedReports: 4,
      dismissedReports: 1,
      escalatedReports: 1,
      criticalReports: 2,
      averageResolutionTime: 12.5,
      reportsToday: 1,
      reportsThisWeek: 5,
      reportsThisMonth: 9,
      topCategories: [
        { category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT, count: 6 },
        { category: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM, count: 4 },
      ],
      moderatorActivity: [{ moderatorId: 'mod-1', actionsCount: 7, resolvedCount: 3 }],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/metrics',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        totalReports: number;
        averageResolutionTime: number;
        topCategories: Array<{ category: string; count: number }>;
        moderatorActivity: Array<{ moderatorId: string; actionsCount: number }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.totalReports).toBe(10);
    expect(body.data.averageResolutionTime).toBe(12.5);
    expect(body.data.topCategories).toEqual([
      { category: 'harassment', count: 6 },
      { category: 'spam', count: 4 },
    ]);
    expect(body.data.moderatorActivity[0]).toMatchObject({ moderatorId: 'mod-1', actionsCount: 7 });
  });

  it('GET /admin/moderation/metrics → 403 when the service denies', async () => {
    mocks.getModerationMetrics.mockRejectedValueOnce({ code: grpcStatus.PERMISSION_DENIED });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/metrics',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(403);
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

  it('POST /admin/support/tickets/:id/assign → { data } and threads assignedTo', async () => {
    mocks.assignSupportTicket.mockResolvedValueOnce({
      ticket: { ...TICKET, assignedTo: 'mod-2' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/support/tickets/tkt-1/assign',
      headers: ADMIN,
      payload: { assignedTo: 'mod-2' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.assignSupportTicket.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      assignedTo: 'mod-2',
    });
  });

  it('GET /admin/moderation/actions/active → { data } and sets active_only', async () => {
    mocks.listModeratorActions.mockResolvedValueOnce({
      actions: [
        {
          actionId: 'act-1',
          moderatorId: 'mod-1',
          actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_BANNED,
          severity: ModerationV1.Severity.SEVERITY_HIGH,
          reason: 'ban',
          targetEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
          targetEntityId: 'usr-9',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/moderation/actions/active?userId=usr-9',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ actionType: string }> };
    expect(body.data[0].actionType).toBe('user_banned');
    expect(mocks.listModeratorActions.mock.calls[0][0]).toMatchObject({
      activeOnly: true,
      targetUserId: 'usr-9',
    });
  });

  it('GET /admin/support/stats → { success, data } shaped for TicketStatsSchema', async () => {
    mocks.getSupportTicketStats.mockResolvedValueOnce({
      total: 20,
      open: 4,
      inProgress: 3,
      waitingForUser: 2,
      resolved: 6,
      closed: 4,
      escalated: 1,
      overdue: 2,
      unassigned: 5,
      averageResponseTime: 3.26,
      averageResolutionTime: 28.5,
      // satisfactionAverage intentionally omitted → surfaced as null.
      ticketsToday: 1,
      ticketsThisWeek: 7,
      ticketsThisMonth: 15,
      byPriority: { low: 2, normal: 10, high: 5, urgent: 2, critical: 1 },
      byCategory: [
        {
          category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
          count: 6,
        },
      ],
      staffActivity: [{ staffId: 'mod-1', assignedCount: 8, resolvedCount: 5 }],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/stats',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: {
        total: number;
        satisfactionAverage: number | null;
        byPriority: { critical: number };
        byCategory: Array<{ category: string; count: number }>;
        staffActivity: Array<{ staffId: string }>;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(20);
    expect(body.data.satisfactionAverage).toBeNull();
    expect(body.data.byPriority.critical).toBe(1);
    expect(body.data.byCategory[0].category).toBe('technical_issue');
    expect(body.data.staffActivity[0].staffId).toBe('mod-1');
  });

  it('GET /admin/support/stats → 403 when the service denies', async () => {
    mocks.getSupportTicketStats.mockRejectedValueOnce({ code: grpcStatus.PERMISSION_DENIED });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/stats',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /admin/support/my-tickets → { data } scoped to the caller (assignedTo)', async () => {
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/my-tickets?status=open',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ ticketId: string }> };
    expect(body.data[0].ticketId).toBe('tkt-1');
    expect(mocks.listSupportTickets.mock.calls[0][0]).toMatchObject({
      assignedTo: 'mod-1',
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
    });
  });

  it('GET /admin/support/tickets/:id/messages → { data } with nested responses', async () => {
    mocks.getSupportTicket.mockResolvedValueOnce({
      ticket: TICKET,
      responses: [
        {
          responseId: 'res-1',
          ticketId: 'tkt-1',
          responderId: 'mod-1',
          responderType:
            ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_STAFF,
          content: 'ack',
          isInternal: false,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/tickets/tkt-1/messages',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: { ticketId: string; responses: Array<{ responseId: string; responderType: string }> };
    };
    expect(body.data.ticketId).toBe('tkt-1');
    expect(body.data.responses[0].responseId).toBe('res-1');
    expect(body.data.responses[0].responderType).toBe('staff');
    expect(mocks.getSupportTicket.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      includeResponses: true,
    });
  });

  it('PATCH /admin/support/tickets/:id → threads status/priority/tags to UpdateSupportTicket', async () => {
    mocks.updateSupportTicket.mockResolvedValueOnce({
      ticket: {
        ...TICKET,
        status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_RESOLVED,
      },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/support/tickets/tkt-1',
      headers: ADMIN,
      payload: { status: 'resolved', priority: 'high', tags: ['vip'] },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.updateSupportTicket.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_RESOLVED,
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_HIGH,
      tags: ['vip'],
    });
    expect((res.json() as { data: { status: string } }).data.status).toBe('resolved');
  });

  it('POST /admin/support/tickets/:id/escalate → maps escalatedTo → assignedTo', async () => {
    mocks.escalateSupportTicket.mockResolvedValueOnce({
      ticket: {
        ...TICKET,
        status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_ESCALATED,
        assignedTo: 'senior-1',
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/support/tickets/tkt-1/escalate',
      headers: ADMIN,
      payload: { escalatedTo: 'senior-1', reason: 'needs senior help' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.escalateSupportTicket.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      assignedTo: 'senior-1',
      reason: 'needs senior help',
    });
    expect((res.json() as { data: { status: string } }).data.status).toBe('escalated');
  });

  it('POST /api/v1/pets/:id/report → FileReport(pet) and { data: { reportId, message } }', async () => {
    mocks.fileReport.mockResolvedValueOnce({ report: REPORT });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pets/pet-42/report',
      headers: ADMIN,
      payload: { reason: 'animal_welfare', description: 'Pet looks neglected in the photos' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { data: { reportId: string; message: string } };
    expect(body.data.reportId).toBe('rpt-1');
    expect(body.data.message).toContain('submitted');
    expect(mocks.fileReport.mock.calls[0][0]).toMatchObject({
      reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET,
      reportedEntityId: 'pet-42',
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_ANIMAL_WELFARE,
    });
  });

  it('POST /api/v1/pets/:id/report → falls back to OTHER + MEDIUM for a free-text reason', async () => {
    mocks.fileReport.mockResolvedValueOnce({ report: REPORT });
    await app.inject({
      method: 'POST',
      url: '/api/v1/pets/pet-42/report',
      headers: ADMIN,
      payload: { reason: 'something is off' },
    });
    expect(mocks.fileReport.mock.calls[0][0]).toMatchObject({
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_OTHER,
      severity: ModerationV1.Severity.SEVERITY_MEDIUM,
      description: 'something is off',
    });
  });
});
