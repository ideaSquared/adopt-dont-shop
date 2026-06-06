import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type DismissNotificationRequest,
  type ListNotificationsRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

import { registerNotificationsRoutes } from './notifications.js';

// --- Fixtures -------------------------------------------------------

const NOTIFICATION_FIXTURE = {
  notificationId: 'n-1',
  userId: 'usr-1',
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  status: NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING,
  title: 'Application received',
  message: 'Your application has been submitted.',
  dataJson: '{}',
  templateVariablesJson: '{}',
  retryCount: 0,
  maxRetries: 3,
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
};

function makeClient(): NotificationsClient & {
  createMock: ReturnType<typeof vi.fn>;
  listMock: ReturnType<typeof vi.fn>;
  dismissMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const listMock = vi.fn();
  const dismissMock = vi.fn();
  return {
    create: createMock,
    list: listMock,
    dismiss: dismissMock,
    close: vi.fn(),
    createMock,
    listMock,
    dismissMock,
  };
}

async function buildApp(client: NotificationsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerNotificationsRoutes(app, { client });
  return app;
}

// --- Tests ----------------------------------------------------------

describe('GET /api/v1/notifications — list', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards principal headers to gRPC metadata', async () => {
    client.listMock.mockResolvedValueOnce({ notifications: [], nextCursor: undefined });

    await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'notifications.read',
      },
    });

    const [, metadata] = client.listMock.mock.calls[0] as [ListNotificationsRequest, Metadata];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
    expect(metadata.get('x-user-roles')).toEqual(['adopter']);
    expect(metadata.get('x-user-permissions')).toEqual(['notifications.read']);
  });

  it('passes query params through (limit, cursor, status filter)', async () => {
    client.listMock.mockResolvedValueOnce({ notifications: [], nextCursor: undefined });

    await app.inject({
      method: 'GET',
      url: '/api/v1/notifications?limit=50&cursor=abc&status=pending',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = client.listMock.mock.calls[0] as [ListNotificationsRequest, Metadata];
    expect(grpcReq.limit).toBe(50);
    expect(grpcReq.cursor).toBe('abc');
    expect(grpcReq.statusFilter).toBe(
      NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING
    );
  });

  it('returns 200 + the proto JSON body on a successful list', async () => {
    client.listMock.mockResolvedValueOnce({
      notifications: [NOTIFICATION_FIXTURE],
      nextCursor: 'next-1',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].notificationId).toBe('n-1');
    // proto3 enums serialise to their SCREAMING_SNAKE name in toJSON output.
    expect(body.notifications[0].type).toBe('NOTIFICATION_TYPE_APPLICATION_STATUS');
    expect(body.nextCursor).toBe('next-1');
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400', async () => {
    client.listMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'limit must be <= 100',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'limit must be <= 100' });
  });

  it('maps gRPC PERMISSION_DENIED to HTTP 403', async () => {
    client.listMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'notifications.read required',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('maps gRPC UNAUTHENTICATED to HTTP 401', async () => {
    client.listMock.mockRejectedValueOnce({
      code: status.UNAUTHENTICATED,
      details: 'missing x-user-id metadata',
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/notifications' });

    expect(res.statusCode).toBe(401);
  });

  it('falls back to HTTP 500 on an unmapped or missing gRPC code', async () => {
    client.listMock.mockRejectedValueOnce({});

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(500);
  });
});

describe('POST /api/v1/notifications — create', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 + the proto JSON of the created notification on success', async () => {
    client.createMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        'x-user-id': 'svc-1',
        'x-user-roles': 'admin',
        'x-user-permissions': 'notifications.create',
        'content-type': 'application/json',
      },
      payload: {
        userId: 'usr-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        title: 'Application received',
        message: 'Your application has been submitted.',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().notification.notificationId).toBe('n-1');
  });

  it('forwards the request body as the gRPC CreateNotificationRequest', async () => {
    client.createMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: {
        userId: 'usr-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
        title: 't',
        message: 'm',
        dataJson: '{"x":1}',
      },
    });

    const [grpcReq] = client.createMock.mock.calls[0] as [CreateNotificationRequest, Metadata];
    expect(grpcReq.userId).toBe('usr-1');
    expect(grpcReq.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER);
    expect(grpcReq.channel).toBe(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_EMAIL);
    expect(grpcReq.dataJson).toBe('{"x":1}');
    expect(grpcReq.templateVariablesJson).toBe('{}'); // default for missing field
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400 on a malformed body', async () => {
    client.createMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'title is required',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: { userId: 'usr-1' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/v1/notifications/:id — dismiss', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes the path :id as DismissNotificationRequest.notification_id', async () => {
    client.dismissMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/n-77',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = client.dismissMock.mock.calls[0] as [DismissNotificationRequest, Metadata];
    expect(grpcReq.notificationId).toBe('n-77');
  });

  it('returns 200 + the proto JSON of the dismissed notification', async () => {
    client.dismissMock.mockResolvedValueOnce({
      notification: {
        ...NOTIFICATION_FIXTURE,
        status: NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_READ,
      },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/n-77',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().notification.status).toBe('NOTIFICATION_STATUS_READ');
  });

  it('maps gRPC NOT_FOUND to HTTP 404', async () => {
    client.dismissMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'notification not found',
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/n-missing',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(404);
  });
});
