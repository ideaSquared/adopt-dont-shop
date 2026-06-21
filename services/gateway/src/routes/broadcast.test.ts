import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsV1 } from '@adopt-dont-shop/proto';

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

  it('forwards a string body.type of "pet_available" as the matching enum value', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 'T', message: 'M', type: 'pet_available' },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_PET_AVAILABLE);
  });

  it('forwards a string body.type of "application_status" as the matching enum value', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 'T', message: 'M', type: 'application_status' },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.type).toBe(
      NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS
    );
  });

  it('forwards a known numeric body.type unchanged', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        cohort: {},
        title: 'T',
        message: 'M',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED,
      },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED);
  });

  it('defaults a missing body.type to UNSPECIFIED', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 'T', message: 'M' },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED);
  });

  it('defaults an unknown body.type to UNSPECIFIED', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 'T', message: 'M', type: 'not_a_real_type' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: { cohort: {}, title: 'T', message: 'M', type: 999 },
    });
    const [stringReq] = broadcast.mock.calls[0];
    const [numericReq] = broadcast.mock.calls[1];
    expect(stringReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED);
    expect(numericReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED);
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

  it('accepts the admin SPA shape: a named `audience` string and a `body` message field', async () => {
    broadcast.mockResolvedValue({ targeted: 5, delivered: 4, suppressed: 1, failed: 0 });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        audience: 'all-adopters',
        title: 'Hello',
        body: 'Heads up',
        channels: ['in_app', 'email'],
      },
    });
    expect(res.statusCode).toBe(200);
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.cohort).toEqual({ userTypes: ['adopter'], statuses: [] });
    expect(grpcReq.message).toBe('Heads up');
    expect(res.json()).toMatchObject({
      success: true,
      data: {
        audience: 'all-adopters',
        targetCount: 5,
        deliveredInApp: 4,
        skippedByPrefs: 0,
        skippedByDnd: 1,
        channels: ['in_app', 'email'],
      },
    });
  });

  it('an explicit `cohort` takes precedence over `audience` when both are sent', async () => {
    broadcast.mockResolvedValue({ targeted: 0, delivered: 0, suppressed: 0, failed: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/broadcast',
      headers: ADMIN_HEADERS,
      payload: {
        audience: 'all-staff',
        cohort: { userTypes: ['adopter'] },
        title: 't',
        message: 'm',
      },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.cohort.userTypes).toEqual(['adopter']);
  });
});

describe('GET /api/v1/notifications/broadcast/preview', () => {
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

  it('resolves a named audience to a cohort size via a dry-run broadcast call', async () => {
    broadcast.mockResolvedValue({ targeted: 42, delivered: 0, suppressed: 0, failed: 0 });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/broadcast/preview?audience=all-rescues',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { audience: 'all-rescues', count: 42 },
    });
    const [grpcReq] = broadcast.mock.calls[0];
    expect(grpcReq.cohort).toEqual({ userTypes: ['rescue_staff'], statuses: [] });
    expect(grpcReq.dryRun).toBe(true);
  });

  it('rejects an unknown audience with 400 without calling the client', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/broadcast/preview?audience=not-a-real-audience',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
    expect(broadcast).not.toHaveBeenCalled();
  });
});
