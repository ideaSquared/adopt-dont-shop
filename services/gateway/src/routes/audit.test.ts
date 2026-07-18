import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuditV1,
  type AuditEvent,
  type AuditGetByTargetResponse,
  type AuditQueryResponse,
} from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';

import { registerAuditRoutes } from './audit.js';

function makeClient(): {
  client: AuditClient;
  queryMock: ReturnType<typeof vi.fn>;
  getByTargetMock: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  const getByTargetMock = vi.fn();
  const client: AuditClient = {
    query: queryMock,
    getByTarget: getByTargetMock,
    close: vi.fn(),
  };
  return { client, queryMock, getByTargetMock };
}

async function makeApp(client: AuditClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAuditRoutes(app, { client });
  return app;
}

const EVENT_FIXTURE: AuditEvent = {
  eventId: 'evt-1',
  service: 'service.auth',
  subject: 'auth.userLoggedIn',
  aggregateType: 'user',
  aggregateId: 'usr-1',
  action: 'login',
  outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS,
  occurredAt: '2026-06-01T12:00:00.000Z',
  recordedAt: '2026-06-01T12:00:00.500Z',
  payloadJson: '{"source":"web"}',
};

const ADMIN_HEADERS = {
  'x-user-id': 'admin-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.audit_logs',
};

describe('GET /api/v1/audit', () => {
  let app: FastifyInstance;
  let queryMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    queryMock = m.queryMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards Query with all filters threaded through query params', async () => {
    const res: AuditQueryResponse = { events: [EVENT_FIXTURE], nextCursor: 'next-cursor' };
    queryMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit?service=service.auth&subject=auth.userLoggedIn&actor_user_id=usr-1&outcome=denied&from=2026-06-01&to=2026-06-02&limit=25&cursor=abc',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.statusCode).toBe(200);
    const grpcReq = queryMock.mock.calls[0][0];
    expect(grpcReq).toMatchObject({
      service: 'service.auth',
      subject: 'auth.userLoggedIn',
      actorUserId: 'usr-1',
      outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED,
      occurredAtFrom: '2026-06-01',
      occurredAtTo: '2026-06-02',
      limit: 25,
      cursor: 'abc',
    });
    expect(httpRes.json()).toMatchObject({ nextCursor: 'next-cursor' });
  });

  it('threads x-user-* metadata to the gRPC client', async () => {
    queryMock.mockResolvedValue({ events: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: ADMIN_HEADERS,
    });

    const metadata = queryMock.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['admin-1']);
    expect(metadata.get('x-user-roles')).toEqual(['admin']);
    expect(metadata.get('x-user-permissions')).toEqual(['admin.audit_logs']);
  });

  it('accepts SCREAMING proto-form outcome', async () => {
    queryMock.mockResolvedValue({ events: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/audit?outcome=AUDIT_OUTCOME_FAILURE',
      headers: ADMIN_HEADERS,
    });

    expect(queryMock.mock.calls[0][0]).toMatchObject({
      outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE,
    });
  });

  it('coerces an unknown outcome string to UNSPECIFIED', async () => {
    queryMock.mockResolvedValue({ events: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/audit?outcome=partial',
      headers: ADMIN_HEADERS,
    });

    expect(queryMock.mock.calls[0][0]).toMatchObject({
      outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_UNSPECIFIED,
    });
  });

  it.each([
    [grpcStatus.PERMISSION_DENIED, 403, 'forbidden'],
    [grpcStatus.INVALID_ARGUMENT, 400, 'test'],
    [grpcStatus.UNAUTHENTICATED, 401, 'unauthenticated'],
    [grpcStatus.INTERNAL, 500, 'internal_error'],
  ])('maps gRPC code %i to HTTP %i', async (gCode, httpCode, expectedError) => {
    queryMock.mockRejectedValue({ code: gCode, details: 'test' });

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.statusCode).toBe(httpCode);
    // INVALID_ARGUMENT echoes the upstream detail (validation error, meant
    // for the caller); PERMISSION_DENIED/UNAUTHENTICATED get a generic
    // message (ADS-973) and 5xx are sanitised — internal text never
    // reaches the client either way.
    expect(httpRes.json()).toMatchObject({ error: expectedError });
  });
});

describe('GET /api/v1/audit/targets/:type/:id', () => {
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

  it('passes :type and :id to GetByTarget as aggregateType/aggregateId', async () => {
    const res: AuditGetByTargetResponse = { events: [EVENT_FIXTURE] };
    getByTargetMock.mockResolvedValue(res);

    const httpRes = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/targets/application/app-1',
      headers: ADMIN_HEADERS,
    });

    expect(httpRes.statusCode).toBe(200);
    expect(getByTargetMock.mock.calls[0][0]).toMatchObject({
      aggregateType: 'application',
      aggregateId: 'app-1',
    });
  });

  it('forwards limit + cursor from query params', async () => {
    getByTargetMock.mockResolvedValue({ events: [] });

    await app.inject({
      method: 'GET',
      url: '/api/v1/audit/targets/pet/pet-1?limit=10&cursor=xyz',
      headers: ADMIN_HEADERS,
    });

    expect(getByTargetMock.mock.calls[0][0]).toMatchObject({
      aggregateType: 'pet',
      aggregateId: 'pet-1',
      limit: 10,
      cursor: 'xyz',
    });
  });
});
