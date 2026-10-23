import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerUsersExportRoutes } from './users-export.js';
import { createEmailRateLimiter, type EmailRateLimiter } from './email-rate-limiter.js';

function makeClient(exportUserData = vi.fn()): AuthClient {
  // Only exportUserData is exercised by this route; the cast avoids
  // stubbing the ~50 other methods on the interface.
  return { exportUserData } as unknown as AuthClient;
}

async function makeApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerUsersExportRoutes(app, { client });
  return app;
}

describe('GET /api/v1/users/me/export', () => {
  it('returns 401 when there is no authenticated user', async () => {
    const app = await makeApp(makeClient());
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/users/me/export' });
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('exports the signed-in principal own data — never another userId', async () => {
    const exportUserData = vi.fn().mockResolvedValue({
      user: {
        userId: 'usr-1',
        email: 'jane@example.com',
        userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
        status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
      },
      privacyPreferences: undefined,
      exportedAt: '2026-09-07T00:00:00.000Z',
    });
    const app = await makeApp(makeClient(exportUserData));
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/export',
        headers: { 'x-user-id': 'usr-1' },
      });

      expect(res.statusCode).toBe(200);
      expect(exportUserData).toHaveBeenCalledWith({ userId: 'usr-1' }, expect.anything());
      expect(res.json()).toMatchObject({
        user: { userId: 'usr-1', email: 'jane@example.com' },
        exportedAt: '2026-09-07T00:00:00.000Z',
      });
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC error (e.g. NOT_FOUND) through handleGrpcError', async () => {
    const exportUserData = vi.fn().mockRejectedValue(
      Object.assign(new Error('user not found'), { code: 5 }) // grpc.status.NOT_FOUND
    );
    const app = await makeApp(makeClient(exportUserData));
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/export',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

// ADS-1421: the per-principal cap is a preHandler, keyed on x-user-id. In
// production that header can only hold the real authenticated userId by the
// time preHandler runs (authenticate.ts's onRequest hook has already
// stripped/re-stamped it), so these tests set the header directly — exactly
// as a post-auth request arrives at this route — and exercise the limiter
// itself: same key shares a bucket, different keys don't, and a tripped
// limiter blocks before the export RPC ever runs.
describe('GET /api/v1/users/me/export — per-principal rate limit (ADS-1421)', () => {
  let app: FastifyInstance;
  let exportUserData: ReturnType<typeof vi.fn>;
  let exportUserRateLimiter: EmailRateLimiter;

  const get = (userId: string) =>
    app.inject({
      method: 'GET',
      url: '/api/v1/users/me/export',
      headers: { 'x-user-id': userId },
    });

  beforeEach(async () => {
    app = Fastify({ logger: false });
    exportUserData = vi.fn().mockResolvedValue({
      user: { userId: 'usr-1', email: 'jane@example.com' },
      exportedAt: '2026-09-07T00:00:00.000Z',
    });
    exportUserRateLimiter = createEmailRateLimiter({ max: 1, windowMs: 60_000 });
    await registerUsersExportRoutes(app, {
      client: makeClient(exportUserData),
      exportUserRateLimiter,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('throttles a second request from the same principal within the window', async () => {
    const first = await get('usr-1');
    expect(first.statusCode).toBe(200);

    const second = await get('usr-1');
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({ success: false, error: 'rate_limit_exceeded' });
    expect(exportUserData).toHaveBeenCalledTimes(1);
  });

  it('does not share a bucket between two different principals', async () => {
    const first = await get('usr-1');
    expect(first.statusCode).toBe(200);

    const other = await get('usr-2');
    expect(other.statusCode).toBe(200);
    expect(exportUserData).toHaveBeenCalledTimes(2);
  });

  it('does not throttle when no exportUserRateLimiter is wired', async () => {
    const bareApp = Fastify({ logger: false });
    const bareExport = vi.fn().mockResolvedValue({
      user: { userId: 'usr-1', email: 'jane@example.com' },
      exportedAt: '2026-09-07T00:00:00.000Z',
    });
    await registerUsersExportRoutes(bareApp, { client: makeClient(bareExport) });
    try {
      const first = await bareApp.inject({
        method: 'GET',
        url: '/api/v1/users/me/export',
        headers: { 'x-user-id': 'usr-1' },
      });
      const second = await bareApp.inject({
        method: 'GET',
        url: '/api/v1/users/me/export',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(bareExport).toHaveBeenCalledTimes(2);
    } finally {
      await bareApp.close();
    }
  });
});
