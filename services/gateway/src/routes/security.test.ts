import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AdminListSessionsRequest,
  AdminLockAccountRequest,
  AdminRevokeSessionRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerSecurityRoutes } from './security.js';

const ADMIN_SESSION = {
  sessionId: 'tok-1',
  familyId: 'fam-1',
  userId: 'usr-2',
  email: 'target@example.com',
  firstName: 'Target',
  lastName: 'User',
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
};

function makeClient() {
  const mocks = {
    adminListSessions: vi.fn(),
    adminRevokeSession: vi.fn(),
    adminRevokeAllUserSessions: vi.fn(),
    adminLockAccount: vi.fn(),
    adminUnlockAccount: vi.fn(),
  };
  return { client: mocks as unknown as AuthClient, mocks };
}

async function buildApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerSecurityRoutes(app, { client });
  return app;
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.security.read,admin.security.manage',
};

describe('GET /api/v1/admin/security/sessions', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    const c = makeClient();
    mocks = c.mocks;
    app = await buildApp(c.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('reshapes sessions into the SPA Session shape with pagination', async () => {
    mocks.adminListSessions.mockResolvedValueOnce({
      sessions: [ADMIN_SESSION],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/security/sessions?page=1&limit=20',
      headers: ADMIN_HEADERS,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: Array<Record<string, unknown>>;
      pagination: Record<string, unknown>;
    };
    expect(body.data[0]).toEqual({
      sessionId: 'tok-1',
      userId: 'usr-2',
      familyId: 'fam-1',
      isRevoked: false,
      expiresAt: '2026-12-31T00:00:00.000Z',
      createdAt: '2026-06-01T00:00:00.000Z',
      user: {
        userId: 'usr-2',
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
      },
    });
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('forwards a user_id filter to the gRPC request', async () => {
    mocks.adminListSessions.mockResolvedValueOnce({
      sessions: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
    await app.inject({
      method: 'GET',
      url: '/api/v1/admin/security/sessions?userId=usr-2',
      headers: ADMIN_HEADERS,
    });
    const [grpcReq] = mocks.adminListSessions.mock.calls[0] as [AdminListSessionsRequest, Metadata];
    expect(grpcReq.userId).toBe('usr-2');
  });

  it('rejects a non-integer limit with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/security/sessions?limit=abc',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.adminListSessions).not.toHaveBeenCalled();
  });

  it('maps gRPC PERMISSION_DENIED to HTTP 403', async () => {
    mocks.adminListSessions.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: "'admin.security.read' required",
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/security/sessions',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/v1/admin/security/sessions/:sessionId', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    const c = makeClient();
    mocks = c.mocks;
    app = await buildApp(c.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 204 on success', async () => {
    mocks.adminRevokeSession.mockResolvedValueOnce({ sessionId: 'tok-1' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/security/sessions/tok-1',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    const [grpcReq] = mocks.adminRevokeSession.mock.calls[0] as [
      AdminRevokeSessionRequest,
      Metadata,
    ];
    expect(grpcReq.sessionId).toBe('tok-1');
  });

  it('maps gRPC NOT_FOUND to HTTP 404', async () => {
    mocks.adminRevokeSession.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'not found',
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/security/sessions/ghost',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/admin/security/users/:userId/sessions', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    const c = makeClient();
    mocks = c.mocks;
    app = await buildApp(c.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the revoked count in a success envelope', async () => {
    mocks.adminRevokeAllUserSessions.mockResolvedValueOnce({ revokedCount: 3 });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/security/users/usr-2/sessions',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, data: { revokedCount: 3 } });
  });
});

describe('POST /api/v1/admin/security/users/:userId/lock', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    const c = makeClient();
    mocks = c.mocks;
    app = await buildApp(c.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 204 and forwards the reason', async () => {
    mocks.adminLockAccount.mockResolvedValueOnce({ user: {} });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/security/users/usr-2/lock',
      headers: ADMIN_HEADERS,
      payload: { reason: 'fraud' },
    });
    expect(res.statusCode).toBe(204);
    const [grpcReq] = mocks.adminLockAccount.mock.calls[0] as [AdminLockAccountRequest, Metadata];
    expect(grpcReq.userId).toBe('usr-2');
    expect(grpcReq.reason).toBe('fraud');
  });

  it('maps gRPC INVALID_ARGUMENT (self-lock) to HTTP 400', async () => {
    mocks.adminLockAccount.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'cannot lock your own account',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/security/users/usr-admin/lock',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/admin/security/users/:userId/unlock', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    const c = makeClient();
    mocks = c.mocks;
    app = await buildApp(c.client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns wasLocked in a success envelope', async () => {
    mocks.adminUnlockAccount.mockResolvedValueOnce({ wasLocked: true });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/security/users/usr-2/unlock',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, data: { wasLocked: true } });
  });
});
