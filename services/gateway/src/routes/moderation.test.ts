import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import { registerModerationRoutes } from './moderation.js';

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
  await registerModerationRoutes(app, { client });
  return app;
}

const HEADERS = {
  'x-user-id': 'mod-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.dashboard',
};

describe('moderation report routes', () => {
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

  it('POST /api/v1/moderation/reports → FileReport with parsed enums, 201', async () => {
    mocks.fileReport.mockResolvedValue({ report: { reportId: 'rpt-1' } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/reports',
      headers: HEADERS,
      payload: {
        reportedEntityType: 'user',
        reportedEntityId: 'usr-2',
        category: 'harassment',
        severity: 'high',
        title: 'Abuse',
        description: 'Threats',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(mocks.fileReport.mock.calls[0][0]).toMatchObject({
      reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
      severity: ModerationV1.Severity.SEVERITY_HIGH,
    });
  });

  it('accepts SCREAMING proto-form enums too', async () => {
    mocks.fileReport.mockResolvedValue({ report: { reportId: 'rpt-1' } });
    await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/reports',
      headers: HEADERS,
      payload: {
        reportedEntityType: 'REPORT_ENTITY_TYPE_PET',
        reportedEntityId: 'pet-1',
        category: 'REPORT_CATEGORY_SPAM',
        severity: 'SEVERITY_LOW',
        title: 'x',
        description: 'y',
      },
    });
    expect(mocks.fileReport.mock.calls[0][0]).toMatchObject({
      reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET,
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM,
    });
  });

  it('GET /api/v1/moderation/reports → ListReports with filters', async () => {
    mocks.listReports.mockResolvedValue({ reports: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/reports?status=pending&severity=high&limit=10',
      headers: HEADERS,
    });
    expect(mocks.listReports.mock.calls[0][0]).toMatchObject({
      status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
      severity: ModerationV1.Severity.SEVERITY_HIGH,
      limit: 10,
    });
  });

  it('GET /api/v1/moderation/reports/:id passes includeTransitions', async () => {
    mocks.getReport.mockResolvedValue({ report: { reportId: 'rpt-1' }, transitions: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/reports/rpt-1?transitions=true',
      headers: HEADERS,
    });
    expect(mocks.getReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      includeTransitions: true,
    });
  });

  it('POST /api/v1/moderation/reports/:id/assign threads moderatorId', async () => {
    mocks.assignReport.mockResolvedValue({ report: { reportId: 'rpt-1' } });
    await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/reports/rpt-1/assign',
      headers: HEADERS,
      payload: { moderatorId: 'mod-2' },
    });
    expect(mocks.assignReport.mock.calls[0][0]).toMatchObject({
      reportId: 'rpt-1',
      moderatorId: 'mod-2',
    });
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    mocks.listReports.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'nope' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/reports',
      headers: HEADERS,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('moderation sanction + ticket routes', () => {
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

  it('GET /api/v1/moderation/users/:userId/sanctions → ListUserSanctions', async () => {
    mocks.listUserSanctions.mockResolvedValue({ sanctions: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/users/usr-2/sanctions?includeInactive=true',
      headers: HEADERS,
    });
    expect(mocks.listUserSanctions.mock.calls[0][0]).toMatchObject({
      userId: 'usr-2',
      includeInactive: true,
    });
  });

  it('POST /api/v1/moderation/sanctions/:id/appeal → AppealSanction', async () => {
    mocks.appealSanction.mockResolvedValue({ sanction: { sanctionId: 'sanc-1' } });
    await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/sanctions/sanc-1/appeal',
      headers: HEADERS,
      payload: { appealReason: 'provoked' },
    });
    expect(mocks.appealSanction.mock.calls[0][0]).toMatchObject({
      sanctionId: 'sanc-1',
      appealReason: 'provoked',
    });
  });

  it('POST /api/v1/moderation/tickets → OpenSupportTicket, 201', async () => {
    mocks.openSupportTicket.mockResolvedValue({ ticket: { ticketId: 'tkt-1' } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/tickets',
      headers: HEADERS,
      payload: {
        userEmail: 'u@e.com',
        subject: 'Help',
        description: 'Locked out',
        priority: 'normal',
        category: 'technical_issue',
        tags: ['login'],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(mocks.openSupportTicket.mock.calls[0][0]).toMatchObject({
      userEmail: 'u@e.com',
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
      category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
    });
  });

  it('POST /api/v1/moderation/tickets/:id/responses → RespondToTicket', async () => {
    mocks.respondToTicket.mockResolvedValue({ response: { responseId: 'rsp-1' } });
    await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/tickets/tkt-1/responses',
      headers: HEADERS,
      payload: { content: 'Try X', isInternal: true },
    });
    expect(mocks.respondToTicket.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      content: 'Try X',
      isInternal: true,
    });
  });

  it('threads x-user-* metadata to the gRPC client', async () => {
    mocks.issueSanction.mockResolvedValue({ sanction: { sanctionId: 'sanc-1' } });
    await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/sanctions',
      headers: HEADERS,
      payload: {
        userId: 'usr-2',
        sanctionType: 'temporary_ban',
        reason: 'harassment',
        description: 'abuse',
      },
    });
    const metadata = mocks.issueSanction.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['mod-1']);
  });
});
