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
  getNotificationMock: ReturnType<typeof vi.fn>;
  getUnreadCountMock: ReturnType<typeof vi.fn>;
  markAllReadMock: ReturnType<typeof vi.fn>;
  deleteNotificationMock: ReturnType<typeof vi.fn>;
  getNotificationPreferencesMock: ReturnType<typeof vi.fn>;
  updateNotificationPreferencesMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const listMock = vi.fn();
  const dismissMock = vi.fn();
  const getNotificationMock = vi.fn();
  const getUnreadCountMock = vi.fn();
  const markAllReadMock = vi.fn();
  const deleteNotificationMock = vi.fn();
  const getNotificationPreferencesMock = vi.fn();
  const updateNotificationPreferencesMock = vi.fn();
  return {
    create: createMock,
    list: listMock,
    dismiss: dismissMock,
    getNotification: getNotificationMock,
    getUnreadCount: getUnreadCountMock,
    markAllRead: markAllReadMock,
    deleteNotification: deleteNotificationMock,
    getNotificationPreferences: getNotificationPreferencesMock,
    updateNotificationPreferences: updateNotificationPreferencesMock,
    close: vi.fn(),
    createMock,
    listMock,
    dismissMock,
    getNotificationMock,
    getUnreadCountMock,
    markAllReadMock,
    deleteNotificationMock,
    getNotificationPreferencesMock,
    updateNotificationPreferencesMock,
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

  it('passes the path :id as DeleteNotificationRequest.notification_id', async () => {
    client.deleteNotificationMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/n-77',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = client.deleteNotificationMock.mock.calls[0] as [
      DismissNotificationRequest,
      Metadata,
    ];
    expect(grpcReq.notificationId).toBe('n-77');
  });

  it('returns 200 + a success envelope on delete', async () => {
    client.deleteNotificationMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/n-77',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      message: 'Notification deleted successfully',
      data: { notificationId: 'n-1' },
    });
  });

  it('maps gRPC NOT_FOUND to HTTP 404', async () => {
    client.deleteNotificationMock.mockRejectedValueOnce({
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

describe('GET /api/v1/notifications/unread/count', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the count from the gRPC handler', async () => {
    client.getUnreadCountMock.mockResolvedValueOnce({ count: 4 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread/count',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: { count: 4 } });
  });

  it('forwards principal headers to gRPC metadata', async () => {
    client.getUnreadCountMock.mockResolvedValueOnce({ count: 0 });
    await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread/count',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [, metadata] = client.getUnreadCountMock.mock.calls[0] as [unknown, Metadata];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
  });
});

describe('POST /api/v1/notifications/read-all', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the affected count', async () => {
    client.markAllReadMock.mockResolvedValueOnce({ affectedCount: 3 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/read-all',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { affectedCount: 3 },
    });
  });
});

describe('GET /api/v1/notifications/:id', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the notification', async () => {
    client.getNotificationMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/n-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { notificationId: 'n-1' },
    });
  });

  it('maps NOT_FOUND to 404', async () => {
    client.getNotificationMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'not found',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/missing',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/v1/notifications/:id/read', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('calls Dismiss with the path :id and returns success envelope', async () => {
    client.dismissMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/n-1/read',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      success: true,
      message: 'Notification marked as read',
    });
    const [grpcReq] = client.dismissMock.mock.calls[0] as [DismissNotificationRequest, Metadata];
    expect(grpcReq.notificationId).toBe('n-1');
  });
});

describe('GET/PUT /api/v1/notifications/preferences', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  const PREFS_FIXTURE = {
    userId: 'usr-1',
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    digestFrequency:
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_WEEKLY,
    applicationUpdates: true,
    petMatches: true,
    rescueUpdates: true,
    chatMessages: true,
    timezone: 'UTC',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  };

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('GET returns preferences inside success envelope', async () => {
    client.getNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/preferences',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { userId: 'usr-1', emailEnabled: true },
    });
  });

  it('PUT maps monolith-compatible body keys (email, push, applications, messages)', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/preferences',
      payload: { email: false, push: true, applications: false, messages: true },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      Record<string, unknown>,
      Metadata,
    ];
    expect(grpcReq.emailEnabled).toBe(false);
    expect(grpcReq.pushEnabled).toBe(true);
    expect(grpcReq.applicationUpdates).toBe(false);
    expect(grpcReq.chatMessages).toBe(true);
  });

  it('PUT maps digestFrequency string to proto enum', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/preferences',
      payload: { digestFrequency: 'daily' },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      Record<string, unknown>,
      Metadata,
    ];
    expect(grpcReq.digestFrequency).toBe(
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_DAILY
    );
  });
});
