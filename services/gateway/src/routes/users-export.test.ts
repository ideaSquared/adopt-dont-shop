import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerUsersExportRoutes } from './users-export.js';

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
