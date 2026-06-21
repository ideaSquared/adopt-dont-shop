import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import { registerAdminInboxRoutes } from './admin-inbox.js';

function makeClient(): {
  client: ModerationClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['listReports', 'listSupportTickets', 'assignReport']) {
    mocks[m] = vi.fn();
  }
  // Default: empty lists so a route that only needs one source still resolves.
  mocks.listReports.mockResolvedValue({ reports: [] });
  mocks.listSupportTickets.mockResolvedValue({ tickets: [] });
  const client = { ...mocks, close: vi.fn() } as unknown as ModerationClient;
  return { client, mocks };
}

async function makeApp(client: ModerationClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAdminInboxRoutes(app, { client });
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
  reportedUserId: 'usr-2',
  category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  severity: ModerationV1.Severity.SEVERITY_HIGH,
  status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
  title: 'Bad behaviour',
  description: 'They were rude',
  evidence: [],
  assignedModerator: undefined,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const TICKET = {
  ticketId: 'tkt-1',
  userId: 'usr-9',
  userEmail: 'reporter@example.com',
  status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
  priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_LOW,
  category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_INQUIRY,
  subject: 'Cannot log in',
  description: 'Login fails',
  assignedTo: 'mod-1',
  tags: [],
  createdAt: '2026-06-02T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
};

type InboxItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  status: string;
  severity: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  relatedUserId: string | null;
  relatedUserEmail: string | null;
};

type InboxBody = {
  data: InboxItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

describe('GET /api/v1/admin/inbox', () => {
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

  it('merges reports and tickets into a unified queue sorted by updatedAt desc', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/inbox', headers: ADMIN });

    expect(res.statusCode).toBe(200);
    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(2);
    // REPORT.updatedAt (06-03) is newer than TICKET.updatedAt (06-02).
    expect(body.data[0].source).toBe('moderation');
    expect(body.data[0].id).toBe('rpt-1');
    expect(body.data[1].source).toBe('support');
    expect(body.pagination).toMatchObject({ page: 1, total: 2, totalPages: 1 });
  });

  it('maps a report into the InboxItem shape with lowercase enum tokens', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });

    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/inbox', headers: ADMIN });

    const item = (res.json() as InboxBody).data[0];
    expect(item).toMatchObject({
      id: 'rpt-1',
      source: 'moderation',
      title: 'Bad behaviour',
      summary: 'They were rude',
      status: 'pending',
      severity: 'high',
      assignedTo: null,
      relatedUserId: 'usr-2',
      relatedUserEmail: null,
    });
  });

  it('maps a ticket into the InboxItem shape (priority → severity, subject → title)', async () => {
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/inbox', headers: ADMIN });

    const item = (res.json() as InboxBody).data[0];
    expect(item).toMatchObject({
      id: 'tkt-1',
      source: 'support',
      title: 'Cannot log in',
      summary: 'Login fails',
      status: 'open',
      severity: 'low',
      assignedTo: 'mod-1',
      relatedUserId: 'usr-9',
      relatedUserEmail: 'reporter@example.com',
    });
  });

  it('honours sortBy=createdAt sortOrder=asc', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?sortBy=createdAt&sortOrder=asc',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    // REPORT.createdAt (06-01) is older than TICKET.createdAt (06-02).
    expect(body.data[0].id).toBe('rpt-1');
    expect(body.data[1].id).toBe('tkt-1');
  });

  it('filters by source=support (does not call listReports)', async () => {
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?source=support',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].source).toBe('support');
    expect(mocks.listReports).not.toHaveBeenCalled();
  });

  it('filters by source=moderation (does not call listSupportTickets)', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?source=moderation',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].source).toBe('moderation');
    expect(mocks.listSupportTickets).not.toHaveBeenCalled();
  });

  it('filters by status', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?status=open',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('open');
  });

  it('filters by severity', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?severity=high',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].severity).toBe('high');
  });

  it('filters by assignedTo (matches the staff member)', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?assignedTo=mod-1',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('tkt-1');
  });

  it('filters by search (case-insensitive across title and summary)', async () => {
    mocks.listReports.mockResolvedValueOnce({ reports: [REPORT] });
    mocks.listSupportTickets.mockResolvedValueOnce({ tickets: [TICKET] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?search=log%20in',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('tkt-1');
  });

  it('paginates the merged list', async () => {
    const reports = Array.from({ length: 3 }, (_, i) => ({
      ...REPORT,
      reportId: `rpt-${i}`,
      updatedAt: `2026-06-0${i + 1}T00:00:00.000Z`,
    }));
    mocks.listReports.mockResolvedValueOnce({ reports });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?page=2&limit=2',
      headers: ADMIN,
    });

    const body = res.json() as InboxBody;
    expect(body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(body.data).toHaveLength(1);
  });

  it('rejects an invalid limit with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/inbox?limit=abc',
      headers: ADMIN,
    });
    expect(res.statusCode).toBe(400);
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    mocks.listReports.mockRejectedValueOnce({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'nope',
    });
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/inbox', headers: ADMIN });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/admin/inbox/assign', () => {
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

  it('assigns a moderation item via assignReport and returns 204', async () => {
    mocks.assignReport.mockResolvedValueOnce({ report: REPORT });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/inbox/assign',
      headers: ADMIN,
      payload: { itemId: 'rpt-1', source: 'moderation', assignedTo: 'mod-2' },
    });

    expect(res.statusCode).toBe(204);
    expect(mocks.assignReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      moderatorId: 'mod-2',
    });
  });

  it('returns 501 for an unsupported support assignment (no backing RPC)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/inbox/assign',
      headers: ADMIN,
      payload: { itemId: 'tkt-1', source: 'support', assignedTo: 'mod-2' },
    });

    expect(res.statusCode).toBe(501);
    expect(mocks.assignReport).not.toHaveBeenCalled();
  });

  it('returns 400 for a message-source assignment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/inbox/assign',
      headers: ADMIN,
      payload: { itemId: 'chat-1', source: 'message', assignedTo: 'mod-2' },
    });

    expect(res.statusCode).toBe(400);
    expect(mocks.assignReport).not.toHaveBeenCalled();
  });

  it('returns 400 when itemId or assignedTo is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/inbox/assign',
      headers: ADMIN,
      payload: { source: 'moderation' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('maps a gRPC NOT_FOUND on assign → 404', async () => {
    mocks.assignReport.mockRejectedValueOnce({
      code: grpcStatus.NOT_FOUND,
      details: 'report not found',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/inbox/assign',
      headers: ADMIN,
      payload: { itemId: 'rpt-x', source: 'moderation', assignedTo: 'mod-2' },
    });

    expect(res.statusCode).toBe(404);
  });
});
