import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

import { registerBroadcastRoutes } from './broadcast.js';

function makeClient(): { client: NotificationsClient; broadcast: ReturnType<typeof vi.fn> } {
  const broadcastFn = vi.fn();
  const client = { broadcast: broadcastFn } as unknown as NotificationsClient;
  return { client, broadcast: broadcastFn };
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.notifications.broadcast',
};

describe('POST /api/v1/notifications/broadcast', () => {
  let app: FastifyInstance;
  let broadcast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, broadcast: b } = makeClient();
    broadcast = b;
    await registerBroadcastRoutes(app, { client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the aggregate counter envelope', async () => {
    broadcast.mockResolvedValue({ targeted: 10, delivered: 8, suppressed: 1, failed: 1 });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        cohort: { userTypes: ['adopter'] },
        title: 'Hello',
        message: 'Heads up',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      targeted: 10,
      delivered: 8,
      suppressed: 1,
      failed: 1,
    });
  });

  it('accepts snake_case body keys too', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        cohort: { user_types: ['adopter'], email_verified: true },
        title: 'T',
        message: 'M',
        action_url: '/announcements/1',
        scheduled_for: '2030-01-01T00:00:00Z',
      },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.cohort.userTypes).toEqual(['adopter']);
    expect(grpcReq.cohort.emailVerified).toBe(true);
    expect(grpcReq.actionUrl).toBe('/announcements/1');
    expect(grpcReq.scheduledFor).toBe('2030-01-01T00:00:00Z');
  });

  it('encodes a `data` object body into dataJson', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        cohort: {},
        title: 'T',
        message: 'M',
        data: { severity: 'high' },
      },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.dataJson).toBe('{"severity":"high"}');
  });

  it('maps gRPC INVALID_ARGUMENT → 400', async () => {
    broadcast.mockRejectedValue({ code: grpcStatus.INVALID_ARGUMENT, details: 'bad' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: '', message: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('maps gRPC PERMISSION_DENIED → 403', async () => {
    broadcast.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'nope' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 't', message: 'm' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('forwards principal headers to the gRPC client', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 't', message: 'm' },
    });
    const [, metadata] = broadcast.mock.calls[0];
    expect(metadata.get('x-user-id')).toEqual(['usr-admin']);
    expect(metadata.get('x-user-permissions')).toEqual(['admin.notifications.broadcast']);
  });
});
