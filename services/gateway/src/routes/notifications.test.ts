import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationsV1,
  type BulkCreateNotificationsRequest,
  type CreateNotificationRequest,
  type DismissNotificationRequest,
  type ListNotificationsRequest,
  type UpdateNotificationPreferencesRequest,
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
  markReadMock: ReturnType<typeof vi.fn>;
  deleteNotificationMock: ReturnType<typeof vi.fn>;
  bulkCreateNotificationsMock: ReturnType<typeof vi.fn>;
  getNotificationPreferencesMock: ReturnType<typeof vi.fn>;
  updateNotificationPreferencesMock: ReturnType<typeof vi.fn>;
  cleanupExpiredNotificationsMock: ReturnType<typeof vi.fn>;
  previewEmailTemplateMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn();
  const listMock = vi.fn();
  const dismissMock = vi.fn();
  const getNotificationMock = vi.fn();
  const getUnreadCountMock = vi.fn();
  const markAllReadMock = vi.fn();
  const markReadMock = vi.fn();
  const deleteNotificationMock = vi.fn();
  const bulkCreateNotificationsMock = vi.fn();
  const getNotificationPreferencesMock = vi.fn();
  const updateNotificationPreferencesMock = vi.fn();
  const cleanupExpiredNotificationsMock = vi.fn();
  const previewEmailTemplateMock = vi.fn();
  return {
    create: createMock,
    list: listMock,
    dismiss: dismissMock,
    getNotification: getNotificationMock,
    getUnreadCount: getUnreadCountMock,
    markAllRead: markAllReadMock,
    markRead: markReadMock,
    deleteNotification: deleteNotificationMock,
    bulkCreateNotifications: bulkCreateNotificationsMock,
    getNotificationPreferences: getNotificationPreferencesMock,
    updateNotificationPreferences: updateNotificationPreferencesMock,
    cleanupExpiredNotifications: cleanupExpiredNotificationsMock,
    previewEmailTemplate: previewEmailTemplateMock,
    close: vi.fn(),
    createMock,
    listMock,
    dismissMock,
    getNotificationMock,
    getUnreadCountMock,
    markAllReadMock,
    markReadMock,
    deleteNotificationMock,
    bulkCreateNotificationsMock,
    getNotificationPreferencesMock,
    updateNotificationPreferencesMock,
    cleanupExpiredNotificationsMock,
    previewEmailTemplateMock,
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

describe('PATCH /api/v1/notifications/mark-read', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards the id list and returns the updated count', async () => {
    client.markReadMock.mockResolvedValueOnce({ affectedCount: 2 });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/mark-read',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
      payload: { notificationIds: ['n-1', 'n-2'] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, data: { updated: 2 } });
    expect(client.markReadMock.mock.calls[0][0]).toEqual({ notificationIds: ['n-1', 'n-2'] });
  });

  it('rejects an empty id list with 400 and does not call the service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/mark-read',
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
      payload: { notificationIds: [] },
    });

    expect(res.statusCode).toBe(400);
    expect(client.markReadMock).not.toHaveBeenCalled();
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

// --- POST /api/v1/notifications/cleanup -----------------------------

describe('POST /api/v1/notifications/cleanup', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the deleted count', async () => {
    client.cleanupExpiredNotificationsMock.mockResolvedValueOnce({ deletedCount: 5 });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/cleanup',
      headers: { 'x-user-id': 'svc-admin', 'content-type': 'application/json' },
      payload: { daysToKeep: 30 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { deletedCount: 5 },
    });

    const [grpcReq] = client.cleanupExpiredNotificationsMock.mock.calls[0] as [
      { daysToKeep: number },
      unknown,
    ];
    expect(grpcReq.daysToKeep).toBe(30);
  });

  it('accepts snake_case days_to_keep', async () => {
    client.cleanupExpiredNotificationsMock.mockResolvedValueOnce({ deletedCount: 0 });
    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/cleanup',
      headers: { 'x-user-id': 'svc-admin', 'content-type': 'application/json' },
      payload: { days_to_keep: 60 },
    });
    const [grpcReq] = client.cleanupExpiredNotificationsMock.mock.calls[0] as [
      { daysToKeep: number },
      unknown,
    ];
    expect(grpcReq.daysToKeep).toBe(60);
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    client.cleanupExpiredNotificationsMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'admin only',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/cleanup',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- POST /api/v1/notifications/schedule ------------------------------

describe('POST /api/v1/notifications/schedule', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('rejects a body without scheduledFor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/schedule',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: { userId: 'usr-1', title: 't', message: 'm' },
    });
    expect(res.statusCode).toBe(400);
    expect(client.createMock).not.toHaveBeenCalled();
  });

  it('forwards scheduledFor to the Create RPC and returns 201', async () => {
    client.createMock.mockResolvedValueOnce({ notification: NOTIFICATION_FIXTURE });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/schedule',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: {
        userId: 'usr-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        title: 'Vet visit',
        message: 'Tomorrow at 10am',
        scheduledFor: '2026-07-01T09:00:00Z',
      },
    });

    expect(res.statusCode).toBe(201);
    const [grpcReq] = client.createMock.mock.calls[0] as [CreateNotificationRequest, unknown];
    expect(grpcReq.scheduledFor).toBe('2026-07-01T09:00:00Z');
    expect(grpcReq.userId).toBe('usr-1');
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400', async () => {
    client.createMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'title is required',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/schedule',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: { scheduledFor: '2026-07-01T09:00:00Z' },
    });
    expect(res.statusCode).toBe(400);
  });
});

// --- POST /api/v1/notifications/bulk -----------------------------------

describe('POST /api/v1/notifications/bulk', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('forwards userIds + payload to BulkCreateNotifications and reshapes the response', async () => {
    client.bulkCreateNotificationsMock.mockResolvedValueOnce({
      totalRequested: 2,
      successful: 1,
      failed: 1,
      results: [
        { userId: 'usr-1', notificationId: 'n-1', created: true },
        { userId: '', created: false, error: 'user_id is required' },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/bulk',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: {
        userIds: ['usr-1', ''],
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        title: 'Maintenance',
        message: 'Down at midnight',
      },
    });

    expect(res.statusCode).toBe(201);
    const [grpcReq] = client.bulkCreateNotificationsMock.mock.calls[0] as [
      BulkCreateNotificationsRequest,
      unknown,
    ];
    expect(grpcReq.userIds).toEqual(['usr-1', '']);

    const body = res.json();
    expect(body).toMatchObject({
      success: true,
      data: {
        totalRequested: 2,
        successful: 1,
        failed: 1,
        notifications: [
          { id: 'n-1', userId: 'usr-1', status: 'created' },
          { id: '', userId: '', status: 'failed', error: 'user_id is required' },
        ],
      },
    });
  });

  it('maps gRPC INVALID_ARGUMENT to HTTP 400', async () => {
    client.bulkCreateNotificationsMock.mockRejectedValueOnce({
      code: status.INVALID_ARGUMENT,
      details: 'user_ids is required',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/bulk',
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
      payload: { userIds: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

// --- GET /api/v1/notifications/user/:userId -----------------------------

describe('GET /api/v1/notifications/user/:userId', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('defaults to page 1 / limit 20 and returns a PaginatedResponse envelope', async () => {
    client.listMock.mockResolvedValueOnce({
      notifications: [NOTIFICATION_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/user/usr-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const [grpcReq] = client.listMock.mock.calls[0] as [ListNotificationsRequest, unknown];
    expect(grpcReq.page).toBe(1);
    expect(grpcReq.limit).toBe(20);
  });

  it('maps category/priority/unreadOnly query params onto the List filters', async () => {
    client.listMock.mockResolvedValueOnce({ notifications: [], total: 0, page: 2, totalPages: 0 });

    await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/user/usr-1?page=2&category=reminder&priority=high&unreadOnly=true',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    const [grpcReq] = client.listMock.mock.calls[0] as [ListNotificationsRequest, unknown];
    expect(grpcReq.page).toBe(2);
    expect(grpcReq.typeFilter).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER);
    expect(grpcReq.priorityFilter).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH
    );
    expect(grpcReq.unreadOnly).toBe(true);
  });

  it('falls back to 0 for total/totalPages when the RPC omits page-mode fields', async () => {
    client.listMock.mockResolvedValueOnce({ notifications: [] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/user/usr-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.json().pagination).toMatchObject({ total: 0, totalPages: 0 });
  });

  it('rejects an invalid limit with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/user/usr-1?limit=abc',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(400);
    expect(client.listMock).not.toHaveBeenCalled();
  });

  it('maps gRPC errors via handleGrpcError', async () => {
    client.listMock.mockRejectedValueOnce({ code: status.PERMISSION_DENIED, details: 'denied' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/user/usr-1',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- PATCH /api/v1/notifications/preferences/:userId --------------------

describe('PATCH /api/v1/notifications/preferences/:userId', () => {
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

  it('targets the path :userId and honours the flat body shape', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1',
      payload: { emailEnabled: false },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.userId).toBe('usr-1');
    expect(grpcReq.emailEnabled).toBe(false);
  });

  it('honours the nested { channels, doNotDisturb } body shape', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1',
      payload: {
        channels: { email: { enabled: false }, push: { enabled: true } },
        doNotDisturb: { enabled: true, startTime: '22:00', endTime: '07:00' },
      },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    expect(res.statusCode).toBe(200);
    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.emailEnabled).toBe(false);
    expect(grpcReq.pushEnabled).toBe(true);
    expect(grpcReq.smsEnabled).toBeUndefined();
    expect(grpcReq.quietHoursStart).toBe('22:00');
    expect(grpcReq.quietHoursEnd).toBe('07:00');
  });

  it('clears quiet hours when doNotDisturb.enabled is false in the nested shape', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1',
      payload: { doNotDisturb: { enabled: false } },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.quietHoursStart).toBe('');
    expect(grpcReq.quietHoursEnd).toBe('');
  });

  it('ignores malformed channel entries (non-object, missing/non-boolean enabled)', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1',
      payload: { channels: { email: 'not-an-object', push: { enabled: 'yes' } } },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.emailEnabled).toBeUndefined();
    expect(grpcReq.pushEnabled).toBeUndefined();
  });

  it('ignores a non-object channels/doNotDisturb body without error', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1',
      payload: { channels: 'nope', doNotDisturb: 'nope' },
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
    });

    expect(res.statusCode).toBe(200);
    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.emailEnabled).toBeUndefined();
    expect(grpcReq.quietHoursStart).toBeUndefined();
  });
});

// --- PATCH /api/v1/notifications/preferences/:userId/dnd ----------------

describe('PATCH /api/v1/notifications/preferences/:userId/dnd', () => {
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
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
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

  it('rejects a body without doNotDisturb', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1/dnd',
      payload: {},
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(client.updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('rejects enabling DND without both startTime and endTime', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1/dnd',
      payload: { doNotDisturb: { enabled: true, startTime: '22:00' } },
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(client.updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('sets the quiet-hours window from doNotDisturb.startTime/endTime', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1/dnd',
      payload: { doNotDisturb: { enabled: true, startTime: '22:00', endTime: '07:00' } },
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(200);
    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.userId).toBe('usr-1');
    expect(grpcReq.quietHoursStart).toBe('22:00');
    expect(grpcReq.quietHoursEnd).toBe('07:00');
  });

  it('clears the quiet-hours window when enabled is false', async () => {
    client.updateNotificationPreferencesMock.mockResolvedValueOnce({ preferences: PREFS_FIXTURE });

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1/dnd',
      payload: { doNotDisturb: { enabled: false } },
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
    });

    const [grpcReq] = client.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      unknown,
    ];
    expect(grpcReq.quietHoursStart).toBe('');
    expect(grpcReq.quietHoursEnd).toBe('');
  });

  it('maps gRPC errors via handleGrpcError', async () => {
    client.updateNotificationPreferencesMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'denied',
    });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/preferences/usr-1/dnd',
      payload: { doNotDisturb: { enabled: true, startTime: '22:00', endTime: '07:00' } },
      headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- POST /api/v1/notifications/templates/:templateId/process -----------

describe('POST /api/v1/notifications/templates/:templateId/process', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });
  afterEach(async () => {
    await app.close();
  });

  it('renders the template and reshapes the response into { title, message }', async () => {
    client.previewEmailTemplateMock.mockResolvedValueOnce({
      subject: 'Hi Rex',
      htmlContent: '<p>Hi Rex</p>',
      textContent: 'Welcome, Rex!',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/templates/tpl-1/process',
      payload: { variables: { name: 'Rex' } },
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { title: 'Hi Rex', message: 'Welcome, Rex!' },
    });

    const [grpcReq] = client.previewEmailTemplateMock.mock.calls[0] as [
      { templateId: string; variablesJson: string },
      unknown,
    ];
    expect(grpcReq.templateId).toBe('tpl-1');
    expect(grpcReq.variablesJson).toBe('{"name":"Rex"}');
  });

  it('falls back to htmlContent when the template has no textContent', async () => {
    client.previewEmailTemplateMock.mockResolvedValueOnce({
      subject: 'Hi Rex',
      htmlContent: '<p>Hi Rex</p>',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/templates/tpl-1/process',
      payload: { variables: { name: 'Rex' } },
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
    });

    expect(res.json()).toMatchObject({ data: { message: '<p>Hi Rex</p>' } });
  });

  it('defaults variablesJson to "{}" when the body omits variables', async () => {
    client.previewEmailTemplateMock.mockResolvedValueOnce({
      subject: 's',
      htmlContent: 'h',
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/templates/tpl-1/process',
      payload: {},
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
    });

    const [grpcReq] = client.previewEmailTemplateMock.mock.calls[0] as [
      { templateId: string; variablesJson: string },
      unknown,
    ];
    expect(grpcReq.variablesJson).toBe('{}');
  });

  it('maps gRPC NOT_FOUND to HTTP 404', async () => {
    client.previewEmailTemplateMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'template not found',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/templates/tpl-1/process',
      payload: { variables: {} },
      headers: { 'x-user-id': 'svc', 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(404);
  });
});
