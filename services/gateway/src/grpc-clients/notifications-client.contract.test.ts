// Contract tests for the gateway notifications-client.
//
// Boots a real @grpc/grpc-js Server with
// NotificationsV1.NotificationServiceService and verifies:
//   1. Happy-path read: list() — typed request arrives, typed response
//      round-trips.
//   2. Happy-path write: create() — request fields arrive and response
//      round-trips.
//   3. Error contract: PERMISSION_DENIED surfaces with .code intact.

import {
  Metadata,
  Server,
  ServerCredentials,
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type CreateNotificationResponse,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNotificationsClient } from './notifications-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<unknown>) =>
  cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null);

const makeHandlers = (
  overrides: Partial<NotificationsV1.NotificationServiceServer>
): NotificationsV1.NotificationServiceServer => ({
  create: unimplemented,
  list: unimplemented,
  dismiss: unimplemented,
  getNotification: unimplemented,
  getUnreadCount: unimplemented,
  markAllRead: unimplemented,
  deleteNotification: unimplemented,
  getNotificationPreferences: unimplemented,
  updateNotificationPreferences: unimplemented,
  resetNotificationPreferences: unimplemented,
  cleanupExpiredNotifications: unimplemented,
  sendEmail: unimplemented,
  getEmailPreferences: unimplemented,
  updateEmailPreferences: unimplemented,
  listEmailTemplates: unimplemented,
  getEmailTemplate: unimplemented,
  createEmailTemplate: unimplemented,
  updateEmailTemplate: unimplemented,
  deleteEmailTemplate: unimplemented,
  previewEmailTemplate: unimplemented,
  registerDeviceToken: unimplemented,
  unregisterDeviceToken: unimplemented,
  listDeviceTokens: unimplemented,
  broadcast: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('notifications-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: NotificationsV1.NotificationServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(NotificationsV1.NotificationServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: list ─────────────────────────────────────────────────

  it('list — request arrives and typed response round-trips', async () => {
    const want: ListNotificationsResponse = {
      notifications: [],
    };

    let receivedLimit = 0;

    port = await startServer(
      makeHandlers({
        list: (
          call: ServerUnaryCall<ListNotificationsRequest, ListNotificationsResponse>,
          cb: sendUnaryData<ListNotificationsResponse>
        ) => {
          receivedLimit = call.request.limit;
          cb(null, want);
        },
      })
    );

    const client = createNotificationsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.list(
        // All required enum fields must be provided — 0 == UNSPECIFIED
        { limit: 10, statusFilter: 0, channelFilter: 0, typeFilter: 0 },
        new Metadata()
      );
      expect(receivedLimit).toBe(10);
      expect(result.notifications).toEqual([]);
    } finally {
      client.close();
    }
  });

  // ── 2. Write: create ─────────────────────────────────────────────

  it('create — request fields arrive and response round-trips', async () => {
    const want: CreateNotificationResponse = {
      notification: {
        notificationId: 'notif-001',
        userId: 'user-1',
        type: 0,
        channel: 0,
        priority: 0,
        status: 0,
        title: 'Hello',
        message: 'World',
        dataJson: '{}',
        templateVariablesJson: '{}',
        retryCount: 0,
        maxRetries: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    let capturedUserId = '';
    let capturedTitle = '';

    port = await startServer(
      makeHandlers({
        create: (
          call: ServerUnaryCall<CreateNotificationRequest, CreateNotificationResponse>,
          cb: sendUnaryData<CreateNotificationResponse>
        ) => {
          capturedUserId = call.request.userId;
          capturedTitle = call.request.title;
          cb(null, want);
        },
      })
    );

    const client = createNotificationsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.create(
        {
          userId: 'user-1',
          type: 0,
          channel: 0,
          priority: 0,
          title: 'Hello',
          message: 'World',
          dataJson: '{}',
          templateVariablesJson: '{}',
        },
        new Metadata()
      );
      expect(capturedUserId).toBe('user-1');
      expect(capturedTitle).toBe('Hello');
      expect(result.notification?.notificationId).toBe('notif-001');
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('list — PERMISSION_DENIED from the server surfaces with .code intact', async () => {
    port = await startServer(
      makeHandlers({
        list: (
          _call: ServerUnaryCall<ListNotificationsRequest, ListNotificationsResponse>,
          cb: sendUnaryData<ListNotificationsResponse>
        ) => {
          cb(makeServiceError(status.PERMISSION_DENIED, 'forbidden'), null);
        },
      })
    );

    const client = createNotificationsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.list(
        { limit: 10, statusFilter: 0, channelFilter: 0, typeFilter: 0 },
        new Metadata()
      );
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.PERMISSION_DENIED);
    } finally {
      client.close();
    }
  });
});
