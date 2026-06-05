import { describe, expect, it } from 'vitest';

import {
  NotificationsV1,
  PingV1,
  type CreateNotificationRequest,
  type EchoRequest,
  type EchoResponse,
  type Notification,
} from './index.js';

describe('@adopt-dont-shop/proto', () => {
  describe('dual binding (CAD #7)', () => {
    it('exports the value namespace under PingV1 with the message factory', () => {
      expect(PingV1).toBeDefined();
      expect(PingV1.EchoRequest).toBeDefined();
      expect(typeof PingV1.EchoRequest.encode).toBe('function');
      expect(typeof PingV1.EchoRequest.decode).toBe('function');
    });

    it('exports the flat interface for use in type positions', () => {
      // If this compiles, the type-only re-export is reachable. The
      // runtime check just touches the variable so the import isn't
      // tree-shaken into oblivion by the test transformer.
      const req: EchoRequest = { message: 'hi' };
      const res: EchoResponse = { message: 'hi', receivedAt: '2026-01-01T00:00:00Z' };
      expect(req.message).toBe('hi');
      expect(res.receivedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('wire format round-trip', () => {
    it('encodes then decodes a message via the binary wire format', () => {
      const original: EchoRequest = { message: 'hello world' };
      const buf = PingV1.EchoRequest.encode(original).finish();
      const decoded = PingV1.EchoRequest.decode(buf);
      expect(decoded.message).toBe('hello world');
    });

    it('round-trips an EchoResponse including the receivedAt timestamp', () => {
      const original: EchoResponse = {
        message: 'pong',
        receivedAt: '2026-06-04T22:30:00Z',
      };
      const buf = PingV1.EchoResponse.encode(original).finish();
      const decoded = PingV1.EchoResponse.decode(buf);
      expect(decoded).toEqual(original);
    });
  });

  describe('JSON helpers (gateway REST translation surface)', () => {
    it('produces a plain JS object via toJSON', () => {
      const original: EchoRequest = { message: 'json' };
      const json = PingV1.EchoRequest.toJSON(original);
      expect(json).toEqual({ message: 'json' });
    });

    it('parses a JS object back into the message shape via fromJSON', () => {
      const restored = PingV1.EchoRequest.fromJSON({ message: 'json' });
      expect(restored).toEqual({ message: 'json' });
    });
  });

  describe('NotificationsV1 namespace (Phase 1.3a — gRPC services on)', () => {
    it('exports the message factories under the NotificationsV1 namespace', () => {
      expect(NotificationsV1.Notification).toBeDefined();
      expect(NotificationsV1.CreateNotificationRequest).toBeDefined();
      expect(NotificationsV1.ListNotificationsRequest).toBeDefined();
      expect(NotificationsV1.DismissNotificationRequest).toBeDefined();
    });

    it('exports the gRPC service definition table (outputServices=grpc-js)', () => {
      expect(NotificationsV1.NotificationServiceService).toBeDefined();
      // grpc-js Definition tables are objects keyed by method name with
      // a `path` (`/<package>.<Service>/<Method>`) on each entry. This
      // is the shape `server.addService(...)` consumes.
      expect(NotificationsV1.NotificationServiceService).toMatchObject({
        create: { path: '/adopt_dont_shop.notifications.v1.NotificationService/Create' },
        list: { path: '/adopt_dont_shop.notifications.v1.NotificationService/List' },
        dismiss: { path: '/adopt_dont_shop.notifications.v1.NotificationService/Dismiss' },
      });
    });

    it('exports a gRPC client constructor (callable to make a stub)', () => {
      expect(NotificationsV1.NotificationServiceClient).toBeDefined();
      expect(typeof NotificationsV1.NotificationServiceClient).toBe('function');
    });

    it('exposes the enum value sets that mirror the Postgres ENUM types', () => {
      // Sanity-check a value from each enum so a careless rename in
      // the .proto fails the test.
      expect(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP).toBe(1);
      expect(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL).toBe(2);
      expect(NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING).toBe(1);
      expect(NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS).toBe(1);
      expect(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION
      ).toBe(1);
    });

    it('round-trips a CreateNotificationRequest through the binary wire format', () => {
      const original: CreateNotificationRequest = {
        userId: 'usr-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
        title: 'Application submitted',
        message: 'Your application was received.',
        dataJson: '{"applicationId":"app-1"}',
        templateVariablesJson: '{}',
      };

      const buf = NotificationsV1.CreateNotificationRequest.encode(original).finish();
      const decoded = NotificationsV1.CreateNotificationRequest.decode(buf);

      expect(decoded.userId).toBe('usr-1');
      expect(decoded.title).toBe('Application submitted');
      expect(decoded.dataJson).toBe('{"applicationId":"app-1"}');
      expect(decoded.type).toBe(
        NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS
      );
    });

    it('flat type-only re-exports compile in type position', () => {
      const n: Notification = {
        notificationId: 'n-1',
        userId: 'u-1',
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_REMINDER,
        channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
        priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_LOW,
        status: NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING,
        title: 't',
        message: 'm',
        dataJson: '{}',
        templateVariablesJson: '{}',
        retryCount: 0,
        maxRetries: 3,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };
      // Runtime touches so the imports aren't tree-shaken into oblivion.
      expect(n.notificationId).toBe('n-1');
    });
  });
});
