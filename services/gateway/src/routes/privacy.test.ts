import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerPrivacyRoutes } from './privacy.js';

type Mocks = {
  client: AuthClient;
  exportUserData: ReturnType<typeof vi.fn>;
  requestAccountDeletion: ReturnType<typeof vi.fn>;
};

function makeClient(): Mocks {
  const exportUserData = vi.fn();
  const requestAccountDeletion = vi.fn();
  // Only the two methods these routes touch are real; the `as unknown as
  // AuthClient` cast avoids stubbing the ~50 other methods on the interface.
  const client = { exportUserData, requestAccountDeletion } as unknown as AuthClient;
  return { client, exportUserData, requestAccountDeletion };
}

async function makeApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerPrivacyRoutes(app, { client });
  return app;
}

const ADMIN_HEADERS = {
  'x-user-id': 'admin-1',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.data.export,users.delete',
};

describe('GET /api/v1/privacy/admin/users/:userId/export', () => {
  it('returns the bundle with the user enums normalised to canonical strings', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.exportUserData.mockResolvedValue({
        user: {
          userId: 'usr-1',
          email: 'jane@example.com',
          userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
          status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
        },
        privacyPreferences: {
          userId: 'usr-1',
          profileVisibility: AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PUBLIC,
          showLastSeen: true,
          showLocation: false,
          allowSearchIndexing: true,
          allowDataExport: true,
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
        exportedAt: '2026-06-23T00:00:00.000Z',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/privacy/admin/users/usr-1/export',
        headers: ADMIN_HEADERS,
      });

      expect(m.exportUserData.mock.calls[0][0]).toMatchObject({ userId: 'usr-1' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user).toMatchObject({ userId: 'usr-1', userType: 'adopter', status: 'active' });
      expect(body.privacyPreferences.allowDataExport).toBe(true);
      expect(body.exportedAt).toBe('2026-06-23T00:00:00.000Z');
    } finally {
      await app.close();
    }
  });

  it('omits privacyPreferences when the user has none', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.exportUserData.mockResolvedValue({
        user: {
          userId: 'usr-1',
          email: 'jane@example.com',
          userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
          status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
        },
        privacyPreferences: undefined,
        exportedAt: '2026-06-23T00:00:00.000Z',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/privacy/admin/users/usr-1/export',
        headers: ADMIN_HEADERS,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().privacyPreferences).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC PERMISSION_DENIED to 403', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.exportUserData.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/privacy/admin/users/usr-1/export',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC NOT_FOUND to 404', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.exportUserData.mockRejectedValue({ code: grpcStatus.NOT_FOUND });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/privacy/admin/users/ghost/export',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/privacy/admin/users/:userId/delete-request', () => {
  it('schedules deletion, threading the optional reason, and returns the deadline', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.requestAccountDeletion.mockResolvedValue({
        deletionScheduledFor: '2026-07-23T00:00:00.000Z',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/admin/users/usr-1/delete-request',
        headers: ADMIN_HEADERS,
        payload: { reason: 'subject access request' },
      });

      expect(m.requestAccountDeletion.mock.calls[0][0]).toMatchObject({
        userId: 'usr-1',
        reason: 'subject access request',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        success: true,
        data: { deletionScheduledFor: '2026-07-23T00:00:00.000Z' },
      });
    } finally {
      await app.close();
    }
  });

  it('works without a reason in the body', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.requestAccountDeletion.mockResolvedValue({
        deletionScheduledFor: '2026-07-23T00:00:00.000Z',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/admin/users/usr-1/delete-request',
        headers: ADMIN_HEADERS,
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      expect(m.requestAccountDeletion.mock.calls[0][0]).toMatchObject({ userId: 'usr-1' });
    } finally {
      await app.close();
    }
  });

  it('maps a gRPC INVALID_ARGUMENT (e.g. self-deletion) to 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.requestAccountDeletion.mockRejectedValue({ code: grpcStatus.INVALID_ARGUMENT });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/privacy/admin/users/usr-1/delete-request',
        headers: ADMIN_HEADERS,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
