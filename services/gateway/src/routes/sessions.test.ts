import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListSessionsRequest, RevokeSessionRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerSessionsRoutes } from './sessions.js';

const SESSION_FIXTURE = {
  sessionId: 'tok-1',
  familyId: 'fam-1',
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
};

function makeClient(): AuthClient & {
  listSessionsMock: ReturnType<typeof vi.fn>;
  revokeSessionMock: ReturnType<typeof vi.fn>;
} {
  const listSessionsMock = vi.fn();
  const revokeSessionMock = vi.fn();
  return {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    validateToken: vi.fn(),
    getMe: vi.fn(),
    assignRole: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    updateAccount: vi.fn(),
    close: vi.fn(),
    listSessions: listSessionsMock,
    revokeSession: revokeSessionMock,
    listSessionsMock,
    revokeSessionMock,
  };
}

async function buildApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerSessionsRoutes(app, { client });
  return app;
}

describe('GET /api/v1/sessions — list', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns sessions wrapped in { data: [...] } (monolith-shape)', async () => {
    client.listSessionsMock.mockResolvedValueOnce({
      sessions: [SESSION_FIXTURE, { ...SESSION_FIXTURE, sessionId: 'tok-2' }],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sessions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: (typeof SESSION_FIXTURE)[] };
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual(SESSION_FIXTURE);
  });

  it('forwards principal headers as gRPC metadata', async () => {
    client.listSessionsMock.mockResolvedValueOnce({ sessions: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/sessions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [, metadata] = client.listSessionsMock.mock.calls[0] as [ListSessionsRequest, Metadata];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
  });

  it('returns an empty list when the principal has no sessions', async () => {
    client.listSessionsMock.mockResolvedValueOnce({});
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sessions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ data: [] });
  });
});

describe('DELETE /api/v1/sessions/:sessionId — revoke', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 204 with no body on success', async () => {
    client.revokeSessionMock.mockResolvedValueOnce({ sessionId: 'tok-1' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/sessions/tok-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    const [req] = client.revokeSessionMock.mock.calls[0] as [RevokeSessionRequest, Metadata];
    expect(req.sessionId).toBe('tok-1');
  });

  it('maps gRPC NOT_FOUND to HTTP 404', async () => {
    client.revokeSessionMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'not found',
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/sessions/missing',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400', async () => {
    client.revokeSessionMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'session_id is required',
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/sessions/x',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'session_id is required' });
  });
});
