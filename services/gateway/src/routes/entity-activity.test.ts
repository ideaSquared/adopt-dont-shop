import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditV1, type AuditEvent } from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';

import { registerEntityActivityRoutes } from './entity-activity.js';

function makeClient(): { client: AuditClient; getByTargetMock: ReturnType<typeof vi.fn> } {
  const getByTargetMock = vi.fn();
  const client: AuditClient = {
    query: vi.fn(),
    getByTarget: getByTargetMock,
    close: vi.fn(),
  };
  return { client, getByTargetMock };
}

async function makeApp(client: AuditClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerEntityActivityRoutes(app, { client });
  return app;
}

const ADMIN_HEADERS = {
  'x-user-id': 'admin-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.audit_logs',
};

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    eventId: 'evt-1',
    service: 'service.auth',
    subject: 'auth.userLoggedIn',
    aggregateType: 'user',
    aggregateId: 'usr-1',
    action: 'login',
    outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS,
    occurredAt: '2026-06-01T12:00:00.000Z',
    recordedAt: '2026-06-01T12:00:00.500Z',
    payloadJson: '{}',
    ...overrides,
  };
}

describe.each([
  ['/api/v1/users/u1/activity', 'user'],
  ['/api/v1/pets/pet-1/activity', 'pet'],
  ['/api/v1/applications/app-1/activity', 'application'],
  ['/api/v1/rescues/r1/activity', 'rescue'],
  ['/api/v1/chats/chat-1/activity', 'chat'],
  ['/api/v1/admin/moderation/reports/rep-1/activity', 'report'],
  ['/api/v1/admin/support/tickets/t1/activity', 'support_ticket'],
])('GET %s', (url, aggregateType) => {
  let app: FastifyInstance;
  let getByTargetMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    getByTargetMock = m.getByTargetMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it(`forwards aggregateType=${aggregateType} and the :id param`, async () => {
    getByTargetMock.mockResolvedValue({ events: [] });

    const httpRes = await app.inject({ method: 'GET', url, headers: ADMIN_HEADERS });

    expect(httpRes.statusCode).toBe(200);
    expect(getByTargetMock.mock.calls[0][0]).toMatchObject({ aggregateType });
    expect(httpRes.json()).toEqual({ success: true, data: [] });
  });
});

describe('GET /api/v1/users/:id/activity', () => {
  let app: FastifyInstance;
  let getByTargetMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    getByTargetMock = m.getByTargetMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('maps an AuditEvent into the EntityActivity shape', async () => {
    getByTargetMock.mockResolvedValue({ events: [makeEvent()] });

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.json()).toEqual({
      success: true,
      data: [
        {
          activityId: 'evt-1',
          activityType: 'login',
          action: 'login',
          description: 'login',
          category: 'service.auth',
          ipAddress: null,
          userAgent: null,
          createdAt: '2026-06-01T12:00:00.000Z',
        },
      ],
    });
  });

  it('flags a denied outcome in the description', async () => {
    getByTargetMock.mockResolvedValue({
      events: [
        makeEvent({ action: 'updateStatus', outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED }),
      ],
    });

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.json().data[0]).toMatchObject({
      description: 'update status (denied)',
      activityType: 'profile_update',
    });
  });

  it('passes ipAddress/userAgent through when present', async () => {
    getByTargetMock.mockResolvedValue({
      events: [makeEvent({ ipAddress: '127.0.0.1', userAgent: 'curl/8' })],
    });

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.json().data[0]).toMatchObject({
      ipAddress: '127.0.0.1',
      userAgent: 'curl/8',
    });
  });

  it('forwards limit + cursor query params to GetByTarget', async () => {
    getByTargetMock.mockResolvedValue({ events: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity?limit=10&cursor=xyz',
      headers: ADMIN_HEADERS,
    });

    expect(getByTargetMock.mock.calls[0][0]).toMatchObject({
      aggregateType: 'user',
      aggregateId: 'u1',
      limit: 10,
      cursor: 'xyz',
    });
  });

  it('rejects an invalid limit with 400', async () => {
    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity?limit=abc',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.statusCode).toBe(400);
    expect(getByTargetMock).not.toHaveBeenCalled();
  });

  it.each([
    [grpcStatus.PERMISSION_DENIED, 403],
    [grpcStatus.NOT_FOUND, 404],
    [grpcStatus.INTERNAL, 500],
  ])('maps gRPC code %i to HTTP %i', async (gCode, httpCode) => {
    getByTargetMock.mockRejectedValue({ code: gCode, details: 'test' });

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/u1/activity',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.statusCode).toBe(httpCode);
  });
});
