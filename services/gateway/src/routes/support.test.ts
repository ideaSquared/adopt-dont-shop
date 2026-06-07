import { status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationClient } from '../grpc-clients/moderation-client.js';

import { registerSupportRoutes } from './support.js';

function makeClient() {
  const openSupportTicketMock = vi.fn();
  const getSupportTicketMock = vi.fn();
  const listSupportTicketsMock = vi.fn();
  const respondToTicketMock = vi.fn();
  const client = {
    fileReport: vi.fn(),
    getReport: vi.fn(),
    listReports: vi.fn(),
    assignReport: vi.fn(),
    resolveReport: vi.fn(),
    logModeratorAction: vi.fn(),
    listModeratorActions: vi.fn(),
    addEvidence: vi.fn(),
    issueSanction: vi.fn(),
    listUserSanctions: vi.fn(),
    appealSanction: vi.fn(),
    openSupportTicket: openSupportTicketMock,
    getSupportTicket: getSupportTicketMock,
    listSupportTickets: listSupportTicketsMock,
    respondToTicket: respondToTicketMock,
    close: vi.fn(),
  } as unknown as ModerationClient;
  return {
    client,
    openSupportTicketMock,
    getSupportTicketMock,
    listSupportTicketsMock,
    respondToTicketMock,
  };
}

async function makeApp(client: ModerationClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerSupportRoutes(app, { client });
  return app;
}

const HEADERS = { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' };

const TICKET_FIXTURE = {
  ticketId: 'tkt-1',
  userId: 'usr-1',
  userEmail: 'me@example.com',
  status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
  priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
  category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
  subject: 'Site bug',
  description: 'A thing broke',
  tags: [],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

describe('POST /api/v1/support/tickets', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('opens a ticket with body + camelCase userEmail, returns 201', async () => {
    m.openSupportTicketMock.mockResolvedValueOnce({ ticket: TICKET_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/support/tickets',
      headers: HEADERS,
      payload: {
        subject: 'Site bug',
        description: 'A thing broke',
        category: 'technical_issue',
        priority: 'normal',
        userEmail: 'me@example.com',
      },
    });
    expect(res.statusCode).toBe(201);
    const grpcReq = m.openSupportTicketMock.mock.calls[0][0];
    expect(grpcReq).toMatchObject({
      subject: 'Site bug',
      userEmail: 'me@example.com',
      category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
    });
  });

  it('accepts snake_case user_email', async () => {
    m.openSupportTicketMock.mockResolvedValueOnce({ ticket: TICKET_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/support/tickets',
      headers: HEADERS,
      payload: {
        subject: 'x',
        description: 'y',
        category: 'general_question',
        user_email: 'me@example.com',
      },
    });
    expect(m.openSupportTicketMock.mock.calls[0][0]).toMatchObject({ userEmail: 'me@example.com' });
  });
});

describe('GET /api/v1/support/my-tickets', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('lists tickets (self-scope happens server-side)', async () => {
    m.listSupportTicketsMock.mockResolvedValueOnce({
      tickets: [TICKET_FIXTURE],
      nextCursor: 'cur',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/support/my-tickets',
      headers: HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: unknown[]; nextCursor: string };
    expect(body.data).toHaveLength(1);
    expect(body.nextCursor).toBe('cur');
    // The route doesn't add a user_id filter — the moderation handler
    // forces self-scope for non-admins.
    expect(m.listSupportTicketsMock.mock.calls[0][0]).not.toHaveProperty('userId');
  });

  it('passes status filter through', async () => {
    m.listSupportTicketsMock.mockResolvedValueOnce({ tickets: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/support/my-tickets?status=open',
      headers: HEADERS,
    });
    expect(m.listSupportTicketsMock.mock.calls[0][0]).toMatchObject({
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
    });
  });
});

describe('GET /api/v1/support/tickets/:ticketId', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('reads without includeResponses', async () => {
    m.getSupportTicketMock.mockResolvedValueOnce({ ticket: TICKET_FIXTURE, responses: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/support/tickets/tkt-1',
      headers: HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(m.getSupportTicketMock.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      includeResponses: false,
    });
  });

  it('maps NOT_FOUND to 404', async () => {
    m.getSupportTicketMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'gone',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/support/tickets/missing',
      headers: HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/v1/support/tickets/:ticketId/reply', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('posts a reply, never sets isInternal', async () => {
    m.respondToTicketMock.mockResolvedValueOnce({
      response: { responseId: 'rsp-1', ticketId: 'tkt-1' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/support/tickets/tkt-1/reply',
      headers: HEADERS,
      payload: { content: 'thanks!' },
    });
    expect(res.statusCode).toBe(201);
    expect(m.respondToTicketMock.mock.calls[0][0]).toEqual({
      ticketId: 'tkt-1',
      content: 'thanks!',
      isInternal: false,
    });
  });
});

describe('GET /api/v1/support/tickets/:ticketId/messages', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClient>;
  beforeEach(async () => {
    m = makeClient();
    app = await makeApp(m.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('requests includeResponses=true and returns ticket + responses', async () => {
    m.getSupportTicketMock.mockResolvedValueOnce({
      ticket: TICKET_FIXTURE,
      responses: [{ responseId: 'rsp-1', ticketId: 'tkt-1', content: 'first' }],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/support/tickets/tkt-1/messages',
      headers: HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(m.getSupportTicketMock.mock.calls[0][0]).toMatchObject({
      ticketId: 'tkt-1',
      includeResponses: true,
    });
    const body = JSON.parse(res.body) as { data: { responses: unknown[] } };
    expect(body.data.responses).toHaveLength(1);
  });
});
